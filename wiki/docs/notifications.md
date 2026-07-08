---
icon: lucide/bell
---

# 通知

Tally は**支払い予定**（およびトライアル終了・予算超過・解約検討のアラート）の
毎日のダイジェストを、複数のチャンネルに送信できます。タイミングは内蔵
スケジューラーが処理するため、cron は不要です。

対応チャンネル: **Discord** ・ **メール（SMTP）** ・ **汎用 Webhook** ・
**Slack** ・ **ntfy**。すべてユーザーごとに設定でき、複数を同時に有効化できます。

## 仕組み

- スケジューラーは毎分チェックし、1 日 1 回、設定した**送信時刻**（コンテナの
  タイムゾーン基準）に、**何日前まで**の範囲で近日中の支払いを送信します。
- 設定済みの**すべてのチャンネル**に同時に送信されます。
- 時刻はコンテナの `TZ`（既定 `Asia/Tokyo`）に従います。
- **月間予算**を設定していて予測合計が超過する場合は、通知に警告が追加されます。
- サブスクごとに**解約検討リマインド**を設定していると、更新の指定日数前に
  「解約を検討」欄が通知に含まれます。

送信時刻・何日前かは **設定 → 通知** で全チャンネル共通に指定します。

## Discord

1. Discord で **チャンネル設定 → 連携サービス → ウェブフック → 新しいウェブ
   フック** を作成し、URL をコピー。
2. Tally の **設定 → 通知 → Discord 通知** に **Discord Webhook URL** を貼り付け。
3. 「毎日この時刻に支払い予定を自動で Discord 通知する」を ON。
4. 「今すぐテスト送信」で動作確認（全チャンネルに送られます）。

!!! note "本物の Discord Webhook のみ許可"
    セキュリティ（SSRF 対策）のため、Webhook URL は
    `https://discord.com/api/webhooks/...` の形式である必要があります。

## メール（SMTP）

メール通知は**ユーザーごとに** SMTP を設定できます。**設定 → 通知 → メール通知**
で:

1. **通知先メールアドレス**を入力し、「支払い予定をメールでも通知する」を ON。
2. その下の **SMTP サーバー設定**（ホスト / ポート / ユーザー名 / パスワード /
   送信元）を入力。
3. 「今すぐテスト送信」で動作確認。

ユーザーごとの SMTP が未設定の場合は、サーバーの環境変数がフォールバックとして
使われます。既定の `docker-compose.yml` には含まれていないため、サーバー全体の
フォールバックが必要な場合のみ追加してください:

```yaml
environment:
  SMTP_HOST: "smtp.example.com"
  SMTP_PORT: "587"        # 465 は暗黙的 TLS
  SMTP_USER: "you@example.com"
  SMTP_PASS: "app-password"
  SMTP_FROM: "Tally <you@example.com>"
```

どちらも設定されていない場合、メールはスキップされます。

!!! note "パスワードの扱い"
    保存済みの SMTP パスワードやアクセストークンは、ブラウザに再表示されません
    （設定画面ではプレースホルダー表示）。変更したいときだけ入力してください。

## 汎用 Webhook

任意の URL に、支払い予定を **JSON で POST** します。Zapier / IFTTT / n8n など
との連携に便利です。

1. **設定 → 通知 → 汎用 Webhook 通知** で **Webhook URL** を入力し、有効化。
2. 送信されるペイロード（抜粋）:

```json
{
  "source": "tally",
  "event": "upcoming_payments",
  "daysBefore": 3,
  "count": 2,
  "currency": "JPY",
  "monthlyTotal": 9462,
  "budget": null,
  "title": "3日以内の支払い予定（2件）",
  "items": [ { "name": "Netflix", "price": "￥1,490", "dateLabel": "…", "trial": false } ],
  "reviewItems": []
}
```

!!! info "LAN 内の宛先も許可"
    自宅ネットワーク上の n8n・ntfy・Gotify などが正当な用途のため、汎用 Webhook
    と ntfy はプライベートアドレスへの送信も許可しています。宛先はご自身で
    管理してください（Slack は `hooks.slack.com` のみに制限）。

## Slack

Slack の **Incoming Webhook** に送信します。

1. Slack でアプリを作成し **Incoming Webhooks** を有効化、チャンネル用の
   Webhook URL（`https://hooks.slack.com/services/...`）を発行。
2. **設定 → 通知 → Slack 通知** に貼り付けて有効化。

## ntfy

スマートフォンに**プッシュ通知**を届けます（[ntfy.sh](https://ntfy.sh) または
自前サーバー）。

1. **設定 → 通知 → ntfy 通知** に **ntfy トピック URL**
   （例: `https://ntfy.sh/your-topic`）を入力し、有効化。
2. 必要なら**アクセストークン**（任意）を設定。
3. スマホの ntfy アプリで**同じトピックを購読**します。

## 任意: cron 用エンドポイント

外部スケジューラー向けに、ユーザーごとのトークン付きエンドポイントも用意して
います（内蔵スケジューラーがあるため通常は不要）:

```bash
curl "http://host:6400/api/notify?token=YOUR_TOKEN"
```
