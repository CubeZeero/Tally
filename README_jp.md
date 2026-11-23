<p align="center">
  <img src="icons/tally_icon.svg" alt="Tally" width="96" height="110" />
</p>

<h1 align="center">Tally</h1>

<p align="center">セルフホスト可能なサブスクリプション管理ダッシュボード。</p>

<p align="center">
  <a href="README.md">English</a> · 日本語
</p>

---

Tally は、契約中のサブスクリプションの 料金・請求サイクル・更新日・月額/年額合計 を、
自分のサーバー上で管理できるダッシュボードです。Web ブラウザからアクセスでき、
Docker で簡単に起動できます。

📖 **ドキュメント:** [tally.cubezeero.com](https://tally.cubezeero.com/) — 導入・通知・セルフホスト・バックアップ・FAQ（ソースは [`wiki/`](wiki/)）

## 特長

- マルチユーザー — アカウントごとにサブスク・カテゴリ・設定を個別管理
- 月額 / 年額を自動集計（日 / 週 / 月 / 年・N周期ごと）
- 無料トライアル管理 — 初回課金前にアラート
- 多通貨対応 — メイン通貨へ自動換算
- 月間予算 — ダッシュボードの予算バーと予算超過アラート
- 支払い予定の通知 — **Discord**・**メール**・**汎用 Webhook**・**Slack**・**ntfy**、内蔵スケジューラーで毎日自動送信（cron 不要）
- iCal カレンダー連携 — 支払い日を Google / Apple カレンダーで購読
- 解約検討リマインド — 更新の指定日数前に「続けるか」を通知
- サブスクの複製、検索、ステータスフィルタ、並べ替え
- 自動 SQLite バックアップ（データボリューム内に保持）
- **PWA** としてインストール可能（「ホーム画面に追加」、プッシュ通知なし）
- アップデート通知 — 新しいバージョンが GitHub に出るとアプリ内バナーで知らせる
- サービスアイコン（[simple-icons](https://www.npmjs.com/package/simple-icons)）や独自画像を設定
- ユーザーごとの言語・テーマ（English / 日本語、ダーク / ライト）
- カレンダー表示、統計（高額ランキング・円グラフ・折れ線）
- カテゴリ・支払い方法を編集可能
- CSV / JSON の書き出し・読み込み
- セルフホスト — データはサーバー内の SQLite に保存

## クイックスタート（Docker Compose）

```bash
# 1. コードを取得（安定版）
git clone -b stable https://github.com/CubeZeero/Tally.git
cd Tally

# 2. .env を作成し、起動前に編集する
cp .env.example .env
#    → SESSION_SECRET を設定（生成: openssl rand -base64 32）
#    → 必要なら TZ / DISABLE_REGISTRATION / BACKUP_* も設定

# 3. ビルド & 起動
docker compose up -d --build
```

<http://localhost:6400> を開きます。初回はアカウント（ユーザー名＋パスワード）を作成します。
データはサーバー内にのみ保存されます。

> [!IMPORTANT]
> `SESSION_SECRET` は**最初の `docker compose up` より前に**設定してください。
> 未設定だと Tally はプロセスごとにランダムな鍵を使い、再起動のたびに全員
> ログアウトされます。

## docker run で起動

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

## 環境変数

`.env.example` を `.env` にコピーして編集します。Docker Compose がこのファイルを
変数展開で読み込みます。`.env` は git 管理外なので、実際の秘密鍵はコミットしないこと。

| 変数 | 説明 | 既定値 |
| --- | --- | --- |
| `SESSION_SECRET` | セッション Cookie の署名鍵。長いランダム文字列を設定（`openssl rand -base64 32`）。未設定時はプロセスごとにランダム生成され、再起動でセッションがリセットされます。 | （プロセスごとにランダム） |
| `DATABASE_URL` | SQLite ファイルの場所 | `file:/data/tally.db`（Docker） |
| `TALLY_DATA_DIR` | データ（DB＋バックアップ）を置くホストのディレクトリ。外部ストレージを指定するとサーバ内蔵ディスクに残らない。未設定なら Docker 管理の名前付きボリューム | （名前付きボリューム `tally-data`） |
| `TZ` | 通知スケジューラーのタイムゾーン | `Asia/Tokyo` |
| `DISABLE_REGISTRATION` | `0` で最初のアカウント作成後も新規登録を許可 | `1` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | メール通知用の SMTP 設定（フォールバック。ユーザーごとの設定が優先） | （未設定） |
| `BACKUP_ENABLED` | 自動バックアップの有効／無効 | `true` |
| `BACKUP_INTERVAL_HOURS` | 自動バックアップの間隔（時間） | `24` |
| `BACKUP_KEEP` | 保持する世代数 | `7` |
| `BACKUP_DIR` | バックアップの保存先 | データボリューム内の `backups/` |
| `UPDATE_CHECK` | 最新の GitHub タグと比較して「新バージョンあり」バナーを表示。`0` で無効化（定期的な api.github.com へのアクセスを停止） | `1`（有効） |
| `PORT` | 待ち受けポート | `6400` |

### セキュリティ設定

Compose は既定でホストの全インターフェースにポート `6400` を公開します。接続先を絞る場合は、任意で `.env` に `TALLY_BIND_ADDRESS=127.0.0.1` またはサーバー自身の LAN・Tailscale IP を指定します。リバースプロキシ経由で OAuth を使う場合は、外部向け HTTPS オリジンを `TALLY_PUBLIC_URL` に設定してください。

カスタム Webhook は `TALLY_NOTIFICATION_ORIGINS`、ユーザー別 SMTP は `TALLY_SMTP_DESTINATIONS` で接続先を許可します。指定例は [.env.example](.env.example) にあります。

API キーの表示は発行時の一度だけです。Docker で更新すると既存キーも Bearer ヘッダーで引き続き使えます。キー付き MCP URL からは、通常の `/api/mcp` に Bearer ヘッダーまたは OAuth で接続する設定へ切り替えてください。更新後は再ログインと OAuth の再認可が必要です。

## 通知

支払い予定のダイジェスト（トライアル終了・予算超過・解約検討アラートを含む）を、
**Discord**・**メール（SMTP）**・**汎用 Webhook**・**Slack**・**ntfy** に毎日送信
できます。すべてユーザーごとに設定でき、複数を同時に有効化できます。内蔵スケジュー
ラーが指定時刻（コンテナのタイムゾーン基準）に毎日1回送信するため、cron は不要です。
詳しくは [通知ガイド](https://tally.cubezeero.com/notifications/) を参照してください。

## 通貨・為替レート

設定でメイン通貨を選びます。新規アカウントはサインアップ言語から初期値を推定し
（English → **USD** / 日本語 → **JPY**）、いつでも変更できます。他通貨のサブスクは
[open.er-api.com](https://open.er-api.com)（APIキー不要）のレートで自動換算され、
6時間ごと、または手動で更新されます。

## アップデート

リリースは `stable` ブランチとバージョンタグ（例: `v1.0.0`）で管理しています。
起動時に追加的スキーママイグレーションを自動適用するため、データは保持されたまま
更新できます。

```bash
git pull                       # -b stable で clone した場合
docker compose up -d --build
```

特定リリースへの固定・ロールバックは `git checkout v1.0.0`。

## REST API

REST APIは `/api/v1` から利用できます。**環境設定 → MCP連携** でAPIキーを発行し、`Authorization: Bearer` ヘッダーで送ります。取得できるのはキーを発行したユーザー自身のデータです。環境設定でキーを失効すると、すぐにアクセスできなくなります。

登録・編集・停止／再開・複製・削除には、同じ設定欄で別途 **REST API 書き込みキー** を発行し、Bearerヘッダーに指定します。停止は `active: false`、再開は `active: true` を送ります。

```sh
curl -fsS -H "Authorization: Bearer ${TALLY_API_KEY}" \
  'http://localhost:6400/api/v1/subscriptions?activeOnly=true'
```

[OpenAPI定義](public/openapi.json)と[実行用のHTTPリクエスト集](docs/rest-api.http)を用意しています。curlの例では手元のシェルで `TALLY_API_KEY` を設定してください。別の端末から接続する場合はURLを置き換え、実際のキーはGitに保存しないでください。

対応するMCPの操作は[MCPツール一覧](docs/mcp-tools.md)を参照してください。

## ローカル開発

```bash
npm install
cp .env.example .env
npx prisma db push
npm run dev   # http://localhost:6400
```

## 技術スタック

Next.js (App Router) · TypeScript · Prisma · SQLite · Tailwind CSS

## ライセンス

Copyright (C) 2026 CubeZeero

[GNU Affero General Public License v3.0](LICENSE)（AGPL-3.0）で公開しています。
改変版を作成し、それをネットワーク越しに利用者へ提供する場合は、その改変版の
ソースコードも利用者へ提供する必要があります。
