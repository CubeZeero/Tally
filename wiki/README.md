# Tally Wiki

Documentation site for Tally, built with [Zensical](https://zensical.org)
(the static site generator from the Material for MkDocs team) and deployed to
**Cloudflare Pages**.

## Languages

The site is bilingual. Each language is a separately-built site linked by the
header language switcher:

| Language | Docs | Config | Output | URL |
| --- | --- | --- | --- | --- |
| Japanese | `docs/` | `zensical.toml` | `site/` | `/` |
| English | `docs-en/` | `zensical.en.toml` | `site/en/` | `/en/` |

## Local development

```bash
cd wiki
python3 -m venv .venv && source .venv/bin/activate   # Python 3.10+
pip install -r requirements.txt

# Japanese (default)
zensical serve                        # preview at http://localhost:8000
# English
zensical serve -f zensical.en.toml    # preview the English site

# Build both languages into ./site (ja) and ./site/en (en)
zensical build && zensical build -f zensical.en.toml
```

## Deploy to Cloudflare Pages

### Option A — Git integration (recommended, no CI secrets)

In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to
Git**, pick the `CubeZeero/Tally` repo, then set:

| Setting | Value |
| --- | --- |
| Project name | `tally-wiki` |
| Production branch | `main` |
| Framework preset | None |
| Root directory | `wiki` |
| Build command | `pip install -r requirements.txt && zensical build && zensical build -f zensical.en.toml` |
| Build output directory | `site` |
| Environment variable | `PYTHON_VERSION` = `3.12` |

Cloudflare rebuilds and deploys on every push. (A `.python-version` file is also
included so the version is pinned.)

After the first deploy, set `site_url` in `zensical.toml` to your Pages URL
(e.g. `https://tally.cubezeero.com/`) so instant navigation/prefetch work.

### Option B — GitHub Actions

A workflow at `.github/workflows/wiki.yml` builds the site and deploys via
Wrangler on pushes that touch `wiki/**`. Add these repository secrets:

- `CLOUDFLARE_API_TOKEN` — a token with the *Cloudflare Pages: Edit* permission
- `CLOUDFLARE_ACCOUNT_ID` — your account ID

Create the Pages project once (matching `name` in `wrangler.toml`):

```bash
cd wiki
npx wrangler pages project create tally-wiki --production-branch main
```

### Option C — manual one-off

```bash
cd wiki
pip install -r requirements.txt
zensical build && zensical build -f zensical.en.toml
npx wrangler pages deploy site --project-name tally-wiki
```
