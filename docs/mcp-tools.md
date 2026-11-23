# Tally MCP tools

Connect to `/api/mcp` with a Tally API key for reads or authorize `tally:write` through OAuth for mutations.

| Tool | Purpose and arguments |
| --- | --- |
| `list_subscriptions` | Search by `q` (name), `category`, `paymentMethod`, `status` (`active` or `paused`), or `minMonthlyCost` and `maxMonthlyCost` in the main currency. Use `sort` with `name`, `monthly_cost_asc`, `monthly_cost_desc`, or `next_payment`. |
| `get_subscription` | Get one subscription by `id`. |
| `get_totals` | Get normalized monthly and yearly totals and budget status. |
| `get_upcoming_payments` | Get the next charge per active subscription for the next `days`. |
| `get_payment_schedule` | Get all scheduled charges between `start` and `end` (inclusive local dates in `YYYY-MM-DD`, up to 366 days), including recurring charges within the range and the converted total. |
| `get_subscription_reminders` | List reminders within `days` (default 30). Set `kind` to `trial` or `review` to filter. Pending renewal reviews whose deadline has passed are included. |
| `get_spend_breakdown` | Group normalized monthly and yearly spending by `groupBy` (`category` or `paymentMethod`). Excludes paused subscriptions and active trials. |
| `list_categories` | List category names. |
| `list_payment_methods` | List payment method names. |
| `preview_subscription_import` | Pass `format` (`csv` or `json`) and `content` as text. Checks up to 500 records with one-based record numbering and flags duplicate names in the account or input. The preview makes no writes. |
| `manage_subscription_label` | With write access, set `field` to `category` or `paymentMethod`, and provide `action` (`create`, `rename`, or `delete`) and `name`. Rename requires `newName` and updates matching subscriptions. Deleting a label in use requires an existing `replacement`. |
| `create_subscription` | With write access, register a subscription. |
| `update_subscription` | With write access, edit selected fields by `id`. |
| `toggle_subscription` | With write access, pause or resume using `id` and `active`. |
| `duplicate_subscription` | With write access, copy a subscription by `id`. |

The REST endpoints for these capabilities are listed in the [request collection](rest-api.http) and [OpenAPI definition](../public/openapi.json).
