# Tally

セルフホスト可能な **サブスクリプション管理ダッシュボード**。
契約中のサブスク（料金・周期・更新日・カテゴリ）を登録し、月額・年額の合計や次の支払い予定をひと目で把握できます。データはすべて自分のサーバー内の SQLite に保存されます。

Web ブラウザからアクセスし、Docker で一発起動できます。

![Tally](docs/screenshot.png)

## 特長

- 📊 月額・年額の合計を自動集計（日/週/月/年・N周期ごとに対応）
- 💱 **多通貨対応＋自動レート換算** — 各サブスクの通貨をメイン通貨に換算して集計
- 🎨 **サービスアイコン** — [simple-icons](https://www.npmjs.com/package/simple-icons) からブランドロゴを設定
- 🌗 **ダーク / ライトテーマ**切り替え
- 🔔 **Discord 通知（Embed）** — 近日中の支払いを Webhook で送信（cron 連携可）
- 🗂 **カテゴリ・支払い方法**をドロップダウンで選択（環境設定で追加/削除、初期値プリセット）
- 📅 **カレンダー** — 支払い日を月表示
- 📈 **統計** — 最高額・月額平均・年間費用、カテゴリ/支払い方法の円グラフ、今後12ヶ月の折れ線グラフ
- 📊 次の支払い予定の自動計算（任意で次回支払日を明示指定可）/ カテゴリ別ドーナツ / 各行に支払い進捗バー
- 🔐 シンプルなパスワードログイン（初回起動時に設定）
- 🐳 Docker / docker compose でセルフホスト（slim イメージ・既存DBの自動マイグレーション）
- 🎨 ミニマルでエディトリアルな UI

## 技術スタック

Next.js (App Router) + TypeScript / Prisma + SQLite / Tailwind CSS v4

## クイックスタート（Docker Compose 推奨）

```bash
# 1. SESSION_SECRET を安全な値に変更
#    docker-compose.yml の SESSION_SECRET を編集するか、下記で生成した値を設定
openssl rand -base64 32

# 2. 起動
docker compose up -d --build
```

ブラウザで <http://localhost:6400> を開くと、初回はパスワード設定画面が表示されます。
データは名前付きボリューム `tally-data`（コンテナ内 `/data/tally.db`）に永続化されます。

### docker run で起動する場合

```bash
docker build -t tally .
docker run -d \
  --name tally \
  -p 6400:6400 \
  -e SESSION_SECRET="$(openssl rand -base64 32)" \
  -v tally-data:/data \
  tally
```

## 環境変数

| 変数 | 説明 | 既定値 |
| --- | --- | --- |
| `SESSION_SECRET` | セッション Cookie の署名鍵。**本番では必ず変更** | （開発用の固定値） |
| `DATABASE_URL` | SQLite ファイルの場所 | `file:/data/tally.db`（Docker） |
| `PORT` | 待ち受けポート | `6400` |

## ローカル開発

```bash
npm install
cp .env.example .env        # 必要に応じて編集
npx prisma db push          # SQLite を初期化
npm run dev                 # http://localhost:6400
```

## Discord 通知（Embed）

1. Discord のチャンネル設定 → 連携サービス → ウェブフック で URL を発行
2. Tally の「環境設定 → 通知」に Webhook URL を設定
3. 「毎日この時刻に自動で Discord 通知する」を ON にし、**送信時刻**と**何日前まで通知するか**を設定
4. 「今すぐテスト送信」で動作確認

cron の設定は不要です。Tally に内蔵されたスケジューラーが、指定時刻に近日中の支払いを
自動で Discord に送信します（1日1回・重複送信なし）。

送信時刻はコンテナのタイムゾーンに従います。`docker-compose.yml` の `TZ`（既定:
`Asia/Tokyo`）で変更できます。

> 補足: 外部スケジューラーから叩きたい上級者向けに `GET /api/notify?token=...`
> エンドポイントも残しています（トークンで保護）。通常は不要です。

## 通貨とレート換算

「環境設定 → メイン通貨」で集計通貨を選びます。各サブスクには個別の通貨を設定でき、
メイン通貨に自動換算して合計に反映されます。レートは [open.er-api.com](https://open.er-api.com)
から取得し（APIキー不要）、6時間ごと、または「レートを今すぐ更新」で更新します。

## データのバックアップ

SQLite ファイルをコピーするだけです。

```bash
docker compose cp tally:/data/tally.db ./tally-backup.db
```

## パスワードを忘れた場合

データベースの設定行をリセットすると、次回アクセス時に再設定画面が表示されます。

```bash
docker compose exec tally npx prisma db execute \
  --schema prisma/schema.prisma \
  --stdin <<< 'UPDATE "Setting" SET "passwordHash" = NULL WHERE id = 1;'
```

## ライセンス

MIT
