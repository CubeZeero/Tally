---
icon: lucide/play
---

# はじめに

Tally は単一の Docker コンテナとして動作します。データはマウントしたボリューム
上の SQLite に保存されるため、再起動やアップデートをしても保持されます。

## 前提

- [Docker](https://docs.docker.com/get-docker/)（Compose プラグイン付き）
- 自分で管理できるマシン（自宅サーバー、VPS、または手元の PC）

## Docker Compose で起動

```bash
# 1. リポジトリを取得
git clone https://github.com/CubeZeero/Tally.git
cd Tally

# 2. （推奨）git 管理外の .env に強いセッション鍵を設定
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env

# 3. ビルド & 起動
docker compose up -d --build
```

<http://localhost:6400> を開きます。初回はアカウント（ユーザー名＋パスワード）を
作成します。データはサーバー内にのみ保存されます。

!!! tip "最初のアカウント"
    最初に作成したアカウントが、既存データをすべて引き継ぎます。その後は、
    追加登録を止めたい場合に `DISABLE_REGISTRATION=1` を設定します。詳しくは
    [設定](configuration.md) を参照してください。

## `docker run` で起動

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
- 設定で**メイン通貨**、必要なら**月間予算**や**通知**（Discord / メール /
  Webhook / Slack / ntfy）を設定
- **iCal 連携**で支払い日をカレンダーアプリに取り込み、ブラウザの
  「ホーム画面に追加」で **PWA** としてインストール
- 更新・バックアップ・セキュリティは [セルフホスト](self-hosting.md) を参照
