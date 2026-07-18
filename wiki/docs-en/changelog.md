---
icon: lucide/history
---

# Changelog

Release history for Tally. Each version corresponds to a
[GitHub tag](https://github.com/CubeZeero/Tally/tags).

## v1.1.2 — 2026-07-18

- **Settings auto-save** — removed the Save button; changes persist immediately
  (text inputs are debounced). The password is changed via its own button.
- **Accent color** — pick from swatches in Settings (light/dark aware).
- Fixed a flicker when enabling the page-transition fade.
- Fixed the animation/fade switches drifting after a save.
- Fixed "Send test" so it tests the currently entered webhook, not the
  last-saved one.
- Adjusted the position of the dashboard hero circle.

## v1.1.1 — 2026-07-17

- **Manual update check** — the "Check for updates" button on the About page
  now lets you check for the latest version immediately, bypassing the
  6-hour cache.
- Improved the version display with a more readable pill style.

## v1.1.0 — 2026-07-17

- **Update notification** — when a new version is published on GitHub, an
  in-app banner appears at the top of the app (the About page also shows the
  current and latest versions). Can be disabled with the `UPDATE_CHECK=0`
  environment variable.
- **Custom data location** — `TALLY_DATA_DIR` lets you store the database and
  backups in any host directory (e.g. external storage).
- Added a link to the homepage (documentation) on the About page.
- Documentation improvements — consolidated initial setup steps, custom
  domain `tally.cubezeero.com`.

## v1.0.0 — 2026-07-16

Initial release.

- **Subscription management** — cost, billing cycle, next payment date,
  automatic monthly/yearly totals, free trials, duplication, cancel-decision
  reminders, search/filter/sort.
- **Multi-currency** — automatic conversion to your main currency (defaults
  to USD for English sign-ups, JPY for Japanese), monthly budget with
  over-budget alerts.
- **Notifications** — Discord / email / generic webhook / Slack / ntfy (sent
  automatically every day via the built-in scheduler, no cron required).
- **iCal integration**, calendar view, statistics (pie & line charts).
- **PWA** (Add to Home Screen), **automatic backups** (SQLite `VACUUM INTO`).
- Multi-user, Japanese / English, dark / light, component animations and
  page transition fades.
