---
icon: lucide/play
---

# はじめに

Tally は単一の Docker コンテナとして動作します。データはマウントしたボリューム
上の SQLite に保存されるため、再起動やアップデートをしても保持されます。


!!! note "安定版と開発版"
    通常の導入には `stable` を使います。このページのネットワーク・通知関連の `TALLY_*` 設定は、`v1.2.0` 以降に適用されます。特定のリリースを使う場合は、同梱の `.env.example` と `docker-compose.yml` を確認してください。

## 前提

- [Docker](https://docs.docker.com/get-docker/)（Compose プラグイン付き）
- 自分で管理できるマシン（自宅サーバー、VPS、または手元の PC）

## 1. 取得

```bash
git clone -b stable https://github.com/CubeZeero/Tally.git
cd Tally
```

## 2. 環境変数を設定（起動前に）

`.env.example` をコピーして `.env` を作り、**最初の起動より前に**編集します。
`docker-compose.yml` はこの `.env` を変数展開で読み込みます（`.env` は git 管理外）。

```bash
cp .env.example .env

# 署名鍵を生成し、.env の SESSION_SECRET="" に貼り付ける
openssl rand -base64 32
```

設定できる環境変数は次のとおりです。最低限 `SESSION_SECRET` を設定すれば動きます
が、`TZ` や `DISABLE_REGISTRATION`、バックアップ関連も**この段階で**決めておくと
スムーズです。

| 変数 | 説明 | 既定値 |
| --- | --- | --- |
| `SESSION_SECRET` | セッション Cookie の署名鍵。長いランダム文字列を設定（`openssl rand -base64 32`）。未設定の場合はプロセスごとにランダム生成され、再起動でセッションがリセットされます。 | プロセスごとにランダム |
| `DATABASE_URL` | SQLite ファイルの場所 | `file:/data/tally.db`（Docker） |
| `TALLY_DATA_DIR` | データ（DB＋バックアップ）を置くホストのディレクトリ。外部ストレージを指定できる。未設定なら Docker 管理の名前付きボリューム | （名前付きボリューム `tally-data`） |
| `TZ` | 通知スケジューラーのタイムゾーン | `Asia/Tokyo` |
| `DISABLE_REGISTRATION` | `0` で追加アカウントの登録を許可 | `1` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | メール通知用の SMTP 設定（**フォールバック**。ユーザーごとの設定が優先） | （未設定） |
| `BACKUP_ENABLED` | 自動バックアップの有効／無効 | `true` |
| `BACKUP_INTERVAL_HOURS` | 自動バックアップの間隔（時間） | `24` |
| `BACKUP_KEEP` | 保持する世代数（超過分は古いものから削除） | `7` |
| `BACKUP_DIR` | バックアップの保存先 | DB と同じボリューム内の `backups/` |
| `UPDATE_CHECK` | 最新の安定版 GitHub タグと比較して「新バージョンあり」バナーを表示。`0` で無効化（api.github.com への定期アクセスを停止） | `1`（有効） |
| `TALLY_BIND_ADDRESS` | 任意。ポート `6400` の公開先を `127.0.0.1` やサーバー自身の LAN・Tailscale IP に限定 | 未設定（全インターフェース） |
| `TALLY_PUBLIC_URL` | MCP の OAuth と接続 URL に使う外部オリジン。例 `https://tally.example.com` | リクエストから推定 |
| `TALLY_NOTIFICATION_ORIGINS` | カスタム Webhook で許可するオリジンをカンマ区切りで指定。非標準ポートも含める | 空欄 |
| `TALLY_SMTP_DESTINATIONS` | ユーザー別 SMTP で許可する `ホスト:ポート` をカンマ区切りで指定 | 空欄 |
| `PORT` | 待ち受けポート | `6400` |

!!! tip "待ち受け先を絞る"
    未設定なら、LAN・Tailscale を含めホストの全インターフェースで待ち受けます。同じマシンからだけ接続するなら、`.env` に `TALLY_BIND_ADDRESS=127.0.0.1` を設定します。Tailscale に限定するなら、Tally サーバー上で `tailscale ip -4` を実行して得た IP を指定します。変更は `docker compose up -d` で反映します。

Compose の `.env` は変数展開に使います。`SMTP_*`、`BACKUP_*`、`UPDATE_CHECK` を変更する場合は、対象の変数をサービスの `environment` にも渡します。ホスト側のポートは `ports` の公開ポートを変更します。

!!! important "起動前に `SESSION_SECRET` を設定"
    `SESSION_SECRET` は**最初の `docker compose up` より前に**設定してください。
    未設定のまま起動すると、Tally はプロセスごとにランダムな鍵を生成するため、
    コンテナを再起動するたびに全員ログアウトされます。リポジトリは公開されて
    いるので、ハードコードされた値は使わず、必ず自分で生成した鍵を使ってください。

`docker-compose.yml` は次のように `.env` を読み込みます:

```yaml
environment:
  SESSION_SECRET: "${SESSION_SECRET:-}"
  TZ: "${TZ:-Asia/Tokyo}"
  DISABLE_REGISTRATION: "${DISABLE_REGISTRATION:-1}"
```

## 3. ビルド & 起動

```bash
docker compose up -d --build
```

<http://localhost:6400> を開きます。初回はアカウント（ユーザー名＋パスワード）を
作成します。データはサーバー内にのみ保存されます。

!!! tip "最初のアカウント"
    旧シングルユーザー版の未割り当てデータがある場合は、最初に作成したアカウントが引き継ぎます。その後は、
    追加登録を許可する場合に `DISABLE_REGISTRATION=0` を設定してください。

??? note "`docker run` で起動する場合"
    Docker Compose を使わない場合は、環境変数を `-e` で直接渡します。

    ```bash
    docker build -t tally .
    docker run -d \
      --name tally \
      -p 6400:6400 \
      -e SESSION_SECRET="$(openssl rand -base64 32)" \
      -e TZ="Asia/Tokyo" \
      -v tally-data:/data \
      tally
    ```

## 次のステップ

- ダッシュボードからサブスクを追加
- **メイン通貨**、必要なら**月間予算**や**通知**（Discord / メール / Webhook /
  Slack / ntfy）を [設定](configuration.md) で設定
- **iCal 連携**で支払い日をカレンダーアプリに取り込み、ブラウザの
  「ホーム画面に追加」で **PWA** としてインストール
- 更新・バックアップ・セキュリティは [セルフホスト](self-hosting.md) を参照
