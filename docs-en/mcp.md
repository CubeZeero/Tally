---
icon: lucide/plug
---

# MCP integration

Tally exposes a Streamable HTTP MCP server at `/api/mcp`. An AI assistant can
read the signed-in user's subscriptions and, with OAuth write access, manage
them and their categories and payment methods.

!!! note "Available in v1.2.0 and later"
    Check the version running on your Tally instance for tool availability.

## Read tools

| Tool | What it does |
| --- | --- |
| `list_subscriptions` | Search by name (`q`), category, payment method, status, or normalized monthly cost. Sort by name, cost, or next payment. |
| `get_subscription` | Get one subscription by ID. |
| `get_totals` | Get monthly and annual spending totals and budget status. |
| `get_upcoming_payments` | Get the next scheduled charge per active subscription within the given number of days. |
| `get_payment_schedule` | Get every scheduled charge and the converted total in an inclusive `start`–`end` date range of up to 366 days. |
| `get_subscription_reminders` | Find trial end dates and review deadlines. Filter with `kind: "trial"` or `kind: "review"`. |
| `get_spend_breakdown` | Get normalized monthly and yearly spending by category or payment method. |
| `list_categories` / `list_payment_methods` | List categories and payment methods. |
| `preview_subscription_import` | Preview up to 500 CSV or JSON records. Reports ready records, duplicate names, and validation errors without saving. |

## Write tools

Approve `tally:write` on the OAuth consent screen to use these tools.

| Tool | What it does |
| --- | --- |
| `create_subscription` | Register a subscription. |
| `update_subscription` | Update only the supplied fields. |
| `toggle_subscription` | Pause or resume a subscription. |
| `duplicate_subscription` | Create a copy of an existing subscription. |
| `manage_subscription_label` | Add, rename, or delete a category or payment method. Renames update linked subscriptions. Deleting a label in use requires an existing replacement. |

Deleting a subscription is available through the [REST API](rest-api.md).

## Connect a client

- **API key (read-only)** — in **Settings → MCP integration**, generate a read API key and copy it when issued. Set the client URL to `https://<host>/api/mcp` and send `Authorization: Bearer <API key>`. An existing key still works in the header after an upgrade.
- **OAuth (read or write)** — register the same endpoint without a key, then sign in and approve access. Use HTTPS and set `TALLY_PUBLIC_URL` to the external origin. Write tools require explicitly requesting and approving `tally:write`.

If a client previously used a URL with the key appended, update it to use one of these methods. After upgrading, OAuth clients must authorize again.

## Connect over a LAN or Tailscale

A client running on your device can connect directly if it supports Streamable
HTTP, allows HTTP for the target, and can send a Bearer header. Use an endpoint
such as `http://192.168.1.20:6400/api/mcp` or
`http://100.x.x.x:6400/api/mcp` with the read key. This setup needs no custom
domain. For OAuth, use an HTTPS endpoint and configure the proxy to forward the
public host and scheme consistently.

## Client setup

- For Codex or another desktop client with HTTP header configuration, choose **Streamable HTTP**, enter the Tally endpoint, and set the Bearer header for read access.
- For hosted connectors or write access, choose OAuth and make sure the client can reach the configured HTTPS endpoint. For a client that supports only stdio, use a local bridge that can supply the HTTP header.

## Exposing over HTTPS { #https }

ChatGPT and claude.ai (web) connectors connect **from the vendor's servers**, so
your instance must be reachable from the internet over HTTPS (the same as
exposing the web UI). Common options:

- **Cloudflare Tunnel** — public custom domain, no open ports. Free.
- **Reverse proxy + Let's Encrypt** (Caddy / nginx) + your own domain.
- **Tailscale Funnel** — publish a `.ts.net` host over HTTPS.

!!! important "Set a stable SESSION_SECRET"
    OAuth tokens and login sessions are signed with `SESSION_SECRET`. If it's
    unset, a random secret is generated per process and **everyone must
    re-authorize / re-login on every restart**. Set a stable value for
    production (see [Configuration](configuration.md)).

## Troubleshooting and revocation

- If a hosted connector cannot connect, verify that it can reach the configured HTTPS endpoint. A desktop client can instead connect over the LAN or tailnet.
- If a Bearer request fails with `401`, check the key and the plain `/api/mcp` URL. Generate a replacement key when needed. Generating or revoking the key invalidates the previous one.
- If OAuth stops working after upgrading, sign in and authorize again. Keep `SESSION_SECRET` stable and use the same external origin throughout the authorization flow.
