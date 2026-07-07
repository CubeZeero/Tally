---
icon: lucide/list
---

# Features

## Subscriptions

Add each subscription with a name, cost, billing cycle, and start date. Tally
computes the **next payment date**, **monthly** and **yearly** totals.

- Cycles: day / week / month / year, every _N_ cycles
- Optional explicit **next payment date** override
- **Service icons** from [simple-icons](https://simpleicons.org) (search by name)
  or upload your own image
- Accent color, category, payment method, URL, and notes
- Pause/resume without deleting

The list supports **search** (name / category / payment method), a **status
filter** (all / active / paused / trial), and **sorting** (next payment,
monthly high→low / low→high, name).

## Free trials

Mark a subscription with a **trial end date**. While the trial is running it is:

- excluded from monthly / yearly totals (it's free right now),
- shown with a **Trial** badge,
- treated so the **first charge = trial end date**, and you get an alert before
  it converts.

## Currencies & exchange rates

Pick a **main currency** per user. Subscriptions in other currencies are
converted automatically using rates from
[open.er-api.com](https://open.er-api.com) (no API key), refreshed every 6 hours
or on demand.

## Dashboard, calendar & statistics

=== "Dashboard"

    This month's spend, active count, next payment, upcoming payments, and a
    category donut.

=== "Calendar"

    A month view of payment dates. Click a day to see that day's payments and
    total.

=== "Statistics"

    Monthly/yearly totals, average per subscription, most expensive, a 12-month
    forecast line chart, and category / payment-method breakdowns.

## Multi-user

Each account has its own subscriptions, categories, payment methods, and
settings — fully isolated. The first account claims any pre-existing data;
sign-ups can be locked afterwards with `DISABLE_REGISTRATION=1`.

## Internationalization & theme

- **Language** per user: English / 日本語 (chosen at sign-up, editable in settings)
- **Dark / light** theme toggle
- Default categories & payment methods are seeded in the chosen language

## Import & export

Export all subscriptions as **CSV** or **JSON**, and import them back. Useful for
backups and migrating between instances.

## Notifications

Upcoming-payment digests via **Discord** (embed) and **email**, sent by a
built-in daily scheduler — see [Notifications](notifications.md).
