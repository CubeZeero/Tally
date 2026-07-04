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

## 特長

- マルチユーザー — アカウントごとにサブスク・カテゴリ・設定を個別管理
- 月額 / 年額を自動集計（日 / 週 / 月 / 年・N周期ごと）
- 多通貨対応 — メイン通貨へ自動換算
- サービスアイコン（[simple-icons](https://www.npmjs.com/package/simple-icons)）や独自画像を設定
- ダーク / ライトテーマ、多言語（English / 日本語）
- Discord 通知（Embed）— 内蔵スケジューラーが毎日自動送信（cron 不要）
- カレンダー表示、統計（高額ランキング・円グラフ・折れ線）
- カテゴリ・支払い方法を編集可能
- CSV / JSON の書き出し・読み込み
- セルフホスト — データはサーバー内の SQLite に保存

## クイックスタート（Docker Compose）

```bash
# 1. docker-compose.yml の SESSION_SECRET を安全な値に変更
openssl rand -base64 32

# 2. ビルド & 起動
docker compose up -d --build
```

<http://localhost:6400> を開きます。初回はアカウント（ユーザー名＋パスワード）を作成します。
データはサーバー内にのみ保存されます。

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

| 変数 | 説明 | 既定値 |
| --- | --- | --- |
| `SESSION_SECRET` | セッション Cookie の署名鍵。長いランダム文字列を設定（`openssl rand -base64 32`）。未設定時はプロセスごとにランダム生成され、再起動でセッションがリセットされます。 | （プロセスごとにランダム） |
| `DATABASE_URL` | SQLite ファイルの場所 | `file:/data/tally.db`（Docker） |
| `TZ` | 通知スケジューラーのタイムゾーン | `Asia/Tokyo` |
| `DISABLE_REGISTRATION` | `1` で最初のアカウント作成後の新規登録を無効化 | （未設定） |
| `PORT` | 待ち受けポート | `6400` |

秘密情報は `docker-compose.yml` と同じ場所に置く git 管理外の `.env` で渡してください
（実際の秘密鍵はコミットしないこと）:

```bash
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env
```

## Discord 通知

1. Discord チャンネル設定で Webhook を発行
2. 設定 -> 通知 に Webhook URL を入力し、自動通知を ON、送信時刻と「何日前まで」を設定
3. 「今すぐテスト送信」で確認

内蔵スケジューラーが、指定時刻（コンテナのタイムゾーン基準）に毎日1回、近日中の支払いを
送信します。cron の設定は不要です。

## 通貨・為替レート

設定でメイン通貨を選びます。他通貨のサブスクは
[open.er-api.com](https://open.er-api.com)（APIキー不要）のレートで自動換算され、
6時間ごと、または手動で更新されます。

## バックアップ

SQLite ファイルにすべて保存されています。

```bash
docker compose cp tally:/data/tally.db ./tally-backup.db
```

## アップデート

起動時に追加的スキーママイグレーションを自動適用するため、データは保持されたまま更新できます。

```bash
git pull
docker compose up -d --build
```

## パスワードを忘れた場合

ユーザー一覧（ユーザー名）を確認できます。

```bash
docker compose exec -T tally node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.findMany().then(u=>{console.log(u.map(x=>x.username));return p.\$disconnect()})"
```

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
