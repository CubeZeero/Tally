---
icon: lucide/code
---

# REST API

Tally serves the REST API under `/api/v1` on your running instance. The default
Docker port is `6400`.

!!! note "Available in v1.2.0 and later"
    Check `/openapi.json` on your running instance for supported operations.

## Authentication

Generate a key under **Settings → MCP integration** and send it in the
`Authorization: Bearer <key>` header.

| Key | Access |
| --- | --- |
| API key | Read operations and import previews |
| REST API write key | Reads and changes to subscriptions, categories, and payment methods |

Each key accesses only its owner's data and can be revoked independently. Copy it when issued, as it is shown only once.
Use HTTPS for remote requests and keep keys out of URLs and Git.

## Request examples

Set `TALLY_URL` to your instance. Set `TALLY_API_KEY` and `TALLY_WRITE_KEY` in
your local shell.

```bash
TALLY_URL=http://localhost:6400

curl -fsS -H "Authorization: Bearer ${TALLY_API_KEY}" \
  "${TALLY_URL}/api/v1/subscriptions?status=active&sort=next_payment"
```

```bash
curl -fsS -X POST "${TALLY_URL}/api/v1/subscriptions" \
  -H "Authorization: Bearer ${TALLY_WRITE_KEY}" \
  -H 'Content-Type: application/json' \
  --data '{"name":"Demo Video","cost":1200,"currency":"JPY","cycle":"month"}'
```

## Endpoints

Prefix these paths with `/api/v1`.

| Method and path | Purpose |
| --- | --- |
| `GET /subscriptions` | List and search subscriptions |
| `GET /subscriptions/{id}` | Get subscription details |
| `GET /totals` | Get monthly and yearly totals and budget in the main currency |
| `GET /upcoming-payments?days=30` | Get the next payment for each active subscription |
| `GET /payment-schedule?start=2026-12-01&end=2026-12-31` | Get all scheduled charges and their converted total for an inclusive range of up to 366 days |
| `GET /reminders?days=14&kind=trial` | Get trial end dates or review deadlines. Omit `kind` to return both |
| `GET /spend-breakdown?groupBy=category` | Group normalized monthly and yearly spending by category or by `groupBy=paymentMethod` |
| `GET /categories` / `GET /payment-methods` | List categories and payment methods |
| `POST /subscriptions/import-preview` | Validate CSV or JSON candidates without saving |
| `POST /subscriptions` | Register a subscription |
| `PATCH /subscriptions/{id}` | Edit fields. Send `{"active":false}` to pause or `{"active":true}` to resume |
| `POST /subscriptions/{id}/duplicate` | Duplicate a subscription |
| `DELETE /subscriptions/{id}` | Delete a subscription |
| `POST /categories` / `POST /payment-methods` | Create a label with `{"name":"…"}` |
| `PATCH /categories/{name}` / `PATCH /payment-methods/{name}` | Rename a label with `{"name":"New name"}` and update linked subscriptions |
| `DELETE /categories/{name}` / `DELETE /payment-methods/{name}` | Delete a label. When it is in use, set `?replacement=ExistingName` to reassign linked subscriptions |

URL-encode names in paths and query parameters. Search accepts `q`, `category`,
`paymentMethod`, `status` (`active` or `paused`), `minMonthlyCost`, and
`maxMonthlyCost`. Cost filters use the normalized monthly amount in the main
currency. Set `sort` to `name`, `monthly_cost_asc`, `monthly_cost_desc`, or
`next_payment`.

## Import preview

Send the format and the file contents as a string to
`POST /api/v1/subscriptions/import-preview`.

```json
{
  "format": "csv",
  "content": "name,cost,currency\nDemo Music,980,JPY"
}
```

For `format: "json"`, pass a string containing an array or an object with a
`subscriptions` array. The preview validates up to 500 records and returns
`wouldCreate`, `duplicateCount`, `invalidCount`, and per-record results.
It checks for matching names in existing subscriptions and within the input.

## Common status codes

| Status | Meaning |
| --- | --- |
| `200` / `201` / `204` | Success, created, or deleted with no response body |
| `400` | Invalid input or query |
| `401` | Missing, invalid, or revoked key |
| `403` | A REST API write key is required |
| `404` | The requested item does not exist or belong to your account |
| `409` | The name already exists or a label in use needs a replacement |
| `413` | Request body exceeds 1 MiB |

For AI assistants, see [MCP integration](mcp.md).
