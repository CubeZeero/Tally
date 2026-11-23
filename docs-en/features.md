---
icon: lucide/list
---

# Features

## Subscriptions

Register each subscription with a name, price, billing cycle, and start date.
Tally automatically calculates the **next payment date**, the **monthly total**,
and the **yearly total**.

- Cycles: day / week / month / year, every N cycles
- Optionally override with an explicit **next payment date**
- Choose a **service icon** from [simple-icons](https://simpleicons.org) (search
  by name), or upload your own image
- Accent color, category, payment method, URL, and notes
- Pause / resume without deleting
- **Duplication** — copy a similar subscription in one tap
- **Cancel-decision reminders** — get notified whether to keep it a set number
  of days before renewal (per subscription)

The list supports **search** (name / category / payment method), a **status
filter** (all / active / paused / trial), and **sorting** (soonest payment
date, monthly cost high-to-low / low-to-high, name). On mobile, per-row actions
(pause, edit, duplicate, delete) are grouped into a **⋮ menu**.

## Free trial

You can set a **trial end date** on a subscription. While the trial is active:

- It's excluded from the monthly / yearly totals (since it's currently free)
- A **Trial** badge is shown
- The **first charge is treated as the trial end date**, with an alert before
  it becomes paid

## Currencies & rates

Choose your **main currency** per user. Subscriptions in other currencies are
converted automatically using rates from
[open.er-api.com](https://open.er-api.com) (no API key required), refreshed
every 6 hours or on demand.

The default is inferred from the sign-up language (**English → USD** /
**Japanese → JPY**). You can change it anytime after creating your account via
**Settings → Main currency**.

## Monthly budget

Set a budget in your main currency under **Settings → General → Monthly
budget**.

- The dashboard shows a **budget bar** (turns orange with "over by ◯◯" when
  exceeded)
- A **warning is added to notifications** when the projected monthly total
  exceeds the budget

## iCal calendar integration

Payment dates are published as an **iCalendar feed** that you can subscribe to
in calendar apps like Google or Apple Calendar.

- Enable it under **Settings → iCal calendar integration** to issue a
  token-bearing URL (`/api/calendar/<token>`)
- Includes recurring events (repeating based on the cycle) plus a **reminder a
  set number of days before**
- The URL can be **regenerated** (invalidating the old link) or **disabled**

!!! warning "Handling the URL"
    Anyone with the feed URL can view it. Be careful when sharing it.

## PWA (Add to Home Screen)

Tally can be installed on your phone or desktop as a **PWA (Progressive Web
App)** ("Add to Home Screen"). It launches in its own window like a native app
and supports basic offline display. Note: push notifications are not used
(notifications go through [notification channels](notifications.md) instead).

## Automatic backups

Your SQLite database is backed up safely on a regular schedule. See
[Self-Hosting](self-hosting.md) for details.

## Update notification

Tally compares the running version against the latest stable GitHub tag and shows a
**banner at the top** when a newer version is available (the About page also
shows the current/latest version). Dismissing the banner with × suppresses it
for that version until the next release.

- The check result is cached for up to 6 hours, so `api.github.com` is polled
  roughly once every 6 hours
- The **"Check for updates" button on the About page** lets you force a manual
  check that bypasses the cache
- Disable this feature entirely with the `UPDATE_CHECK=0` environment variable
  (see [Getting Started](getting-started.md))

## Dashboard, calendar & stats

=== "Dashboard"

    This month's spend, active subscription count, next payment, upcoming
    payments, and a category breakdown donut chart.

=== "Calendar"

    A monthly view of payment dates. Click a day to see that day's payments
    and their total.

=== "Stats"

    Monthly / yearly totals, average per subscription, highest cost, a
    12-month line chart, and a breakdown by category / payment method.

## Multi-user

Each account keeps its subscriptions, categories, payment methods, and
settings completely separate. The first account inherits unassigned data from legacy single-user versions,
and `DISABLE_REGISTRATION=1` blocks additional sign-ups. This is the default starting with `v1.2.0`.

## Language & theme

- **Language** (per user): Japanese / English (chosen at sign-up, changeable
  in Settings)
- **Dark / light** theme toggle
- Default categories and payment methods are initialized in the selected
  language

## Import & export

Export and import all your subscriptions as **CSV** or **JSON**. Useful for
backups or migrating to another instance.

## Notifications

A digest of upcoming payments is sent via the built-in daily scheduler to
**Discord**, **email**, **generic webhook**, **Slack**, and **ntfy** (including
over-budget and cancel-decision alerts). See [Notifications](notifications.md)
for details.
