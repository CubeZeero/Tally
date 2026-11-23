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
    # stable にいる状態で更新
    git pull --ff-only
    docker compose up -d --build
    ```

    **`main` やバージョンタグから安定版に戻す場合**は、既存の Tally ディレクトリで以下を実行します。`main` にいる状態で `git pull` すると、開発版が更新されます。

    ```bash
    git remote set-branches --add origin stable
    git fetch origin
    git switch stable
    git pull --ff-only
    docker compose up -d --build
    ```

    最初の2行は、単一ブランチだけをクローンしていた場合にも `stable` を取得できるようにします。開発版でDBの形式が変わり、安定版で読み込めない場合は、開発版へ切り替える前のバックアップを使ってください。

=== "バージョンを固定"

    特定リリースに固定するときはタグを使います。古い版に戻す場合は、更新前のDBバックアップを使ってください。

    ```bash
    git fetch --tags
    git switch --detach v1.2.0
    docker compose up -d --build
    ```

=== "開発版（main）"

    最新の開発中コードを試す場合（動作は保証されません）。

    ```bash
    git remote set-branches --add origin main
    git fetch origin
    git switch main
    git pull --ff-only
    docker compose up -d --build
    ```

## データの保存先

既定では、DB とバックアップは Docker 管理の名前付きボリューム（`tally-data`）に
保存されます。**外部ストレージなど任意のホストディレクトリに置きたい**場合は、
`.env` の `TALLY_DATA_DIR` にホストパスを指定するだけで切り替えられます。

```bash
# 1. 保存先ディレクトリを作成
sudo mkdir -p /mnt/storage/tally/data
```

`.env` に次の値を設定します。

```dotenv
TALLY_DATA_DIR=/mnt/storage/tally/data
```

設定を反映して起動します。

```bash
docker compose up -d --build
```

これで `/mnt/storage/tally/data/tally.db`（DB）と `.../backups/`（自動バックアップ）
が指定したディレクトリに保存されます。切り替え前のボリュームには既存データが残ります。`DATABASE_URL`
は `file:/data/tally.db` のまま変更不要です（`/data` はコンテナ内パスで、その実体を
`TALLY_DATA_DIR` が決めます）。

!!! warning "SQLite とネットワークストレージ"
    保存先は**ローカルにマウントされたディスク**を推奨します。NFS / SMB などの
    ネットワークファイルシステムは SQLite のファイルロックが不安定になることが
    あります。

!!! note "既存データの移行"
    名前付きボリュームから移行する場合は、Tally を停止して書き込みを止めてから、
    切り替え前に `tally.db` を新しいディレクトリへコピーしてください（例:
    `docker compose cp tally:/data/tally.db /mnt/storage/tally/data/tally.db`）。

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
docker compose stop tally
docker compose cp tally:/data/tally.db ./tally-backup.db
docker compose up -d
```

ファイルをボリュームに戻して再起動すれば復元できます。アプリ内の
**CSV / JSON エクスポート**でも、サブスクの可搬コピーを取得できます。

## セキュリティチェックリスト

以下は `v1.2.0` 以降の既定値です。

- `SESSION_SECRET` に長いランダムな値を設定し、公開せず固定する。
- 追加登録を許可するときだけ `DISABLE_REGISTRATION=0` にする。最初のアカウントは作成できます。
- Compose は既定で全インターフェースにポートを公開する。公開範囲を絞る場合は `TALLY_BIND_ADDRESS` に `127.0.0.1` またはサーバー自身の LAN・Tailscale IP を指定する。
- HTTPSのリバースプロキシを使う場合は `TALLY_PUBLIC_URL` に外部オリジンを設定し、プロキシから元のスキームを転送する。
- カスタムWebhookとユーザー別SMTPは接続先を明示的に許可する。[通知](notifications.md)を参照。

### セキュリティ変更を含む版に更新

更新後は再ログインし、OAuthクライアントを再認可してください。以前のキー付きMCP URLは、`/api/mcp` とAuthorizationヘッダーに切り替えます。既存のAPIキーはDockerでの移行後もヘッダーで使えます。[MCP連携](mcp.md)を参照。

## パスワードを忘れた場合

パスワードを回復する組み込み機能はありません。パスワードハッシュを削除するとログインできなくなります。

## タイムゾーン

通知の送信時刻はコンテナのタイムゾーンを使用します。`docker-compose.yml` か
`.env` で `TZ`（既定 `Asia/Tokyo`）を設定してください。
