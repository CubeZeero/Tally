---
icon: lucide/server
---

# セルフホスト

## アップデート

Tally は起動時に追加的なスキーママイグレーションを自動適用するため、データは
保持されたまま更新できます。リリースは `stable` ブランチとバージョンタグ
（`v1.0.0` など）で管理しています。

=== "安定版を追う（推奨）"

    検証済みの最新版を配信する `stable` ブランチを使います。

    ```bash
    # 初回
    git clone -b stable https://github.com/CubeZeero/Tally.git
    cd Tally
    # 更新
    git pull
    docker compose up -d --build
    ```

=== "バージョンを固定"

    特定リリースに固定、または以前の版へロールバックしたい場合はタグを使います。

    ```bash
    git fetch --tags
    git checkout v1.0.0
    docker compose up -d --build
    ```

=== "開発版（main）"

    最新の開発中コードを試す場合（動作は保証されません）。

    ```bash
    git checkout main && git pull
    docker compose up -d --build
    ```

## バックアップ

### 自動バックアップ

Tally は SQLite の `VACUUM INTO` を使って**整合性のあるバックアップ**を定期的に
作成します（既定で有効）。保存先はデータと同じボリューム内の `backups/`
（例: `/data/backups/tally-YYYYMMDD-HHmmss.db`）で、古い世代は自動的に整理され
ます。

- 間隔・世代数・保存先は環境変数で調整（[はじめに](getting-started.md) を参照）:
  `BACKUP_ENABLED` / `BACKUP_INTERVAL_HOURS` / `BACKUP_KEEP` / `BACKUP_DIR`
- **設定 → バックアップ**で状態を確認し、「今すぐバックアップ」を手動実行できます。

バックアップはボリューム内にあるため、ボリュームごと（またはホストのバックアップ
先へ）コピーして保全してください:

```bash
docker compose cp tally:/data/backups ./tally-backups
```

### 手動バックアップ / 復元

すべては 1 つの SQLite ファイルに保存されています:

```bash
docker compose cp tally:/data/tally.db ./tally-backup.db
```

ファイルをボリュームに戻して再起動すれば復元できます。アプリ内の
**CSV / JSON エクスポート**でも、サブスクの可搬コピーを取得できます。

## セキュリティチェックリスト

- [x] 強く固定の `SESSION_SECRET` を設定する（コミットしない）。
- [x] HTTPS で配信する（リバースプロキシまたは Tailscale）。リクエストが
      `x-forwarded-proto: https` で届くとセッション Cookie に `Secure` が付与
      されます。
- [x] アカウント作成後、`DISABLE_REGISTRATION=1` で新規登録を止める。
- [x] 送信先 Webhook（Discord / 汎用 / ntfy）は任意ホストを許可 — URL は自分で
      管理する（Slack のみ `hooks.slack.com` に限定）。
- [x] パスワードは bcrypt でハッシュ化、セッションは署名付き JWT。

!!! warning "インターネット公開時の注意"
    初期セットアップができるよう、登録はデフォルトで開放されています。
    インスタンスがインターネットから到達可能な場合は、自分のアカウントを作成
    したらすぐに `DISABLE_REGISTRATION=1` でロックしてください。

## パスワードを忘れた場合

ユーザー一覧を確認したり、ハッシュを消してパスワードをリセット（次回ログイン
時に再設定）できます。例 — ユーザー名の一覧:

```bash
docker compose exec -T tally node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.findMany().then(u=>{console.log(u.map(x=>x.username));return p.\$disconnect()})"
```

## タイムゾーン

通知の送信時刻はコンテナのタイムゾーンを使用します。`docker-compose.yml` か
`.env` で `TZ`（既定 `Asia/Tokyo`）を設定してください。
