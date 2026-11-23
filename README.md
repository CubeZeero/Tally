# Tally Wiki

The Japanese and English [Tally documentation](https://tally.cubezeero.com/) is built with Zensical. The `wiki` branch has the documentation and build config at its root.

## Local preview

Run these commands from the Wiki worktree. The Python version is specified in `.python-version`.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
zensical build
zensical build -f zensical.en.toml
python -m http.server 4896 --bind 127.0.0.1 --directory site
```

Open `http://localhost:4896/` for Japanese or `http://localhost:4896/en/` for English. Rebuild after editing either language. For single-language live reload, use `zensical serve` and pass `-f zensical.en.toml` for English.

## Cloudflare deployment

Cloudflare Workers Builds deploys the `wiki` branch. Leave the root directory field blank. Use the following settings for the `tally` Worker.

| Setting | Value |
| --- | --- |
| Branch | `wiki` |
| Build command | `pip install -r requirements.txt && zensical build && zensical build -f zensical.en.toml` |
| Deploy command | `npx wrangler deploy` |
| Static assets | `site/`, configured in `wrangler.toml` |
