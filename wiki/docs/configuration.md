---
icon: lucide/settings
---

# 設定

Tally は、いくつかの環境変数（サーバー側）と、アプリの設定画面で変更する
ユーザーごとのオプションで構成します。

## 環境変数

| 変数 | 説明 | 既定値 |
| --- | --- | --- |
| `SESSION_SECRET` | セッション Cookie の署名鍵。長いランダム文字列を設定（`openssl rand -base64 32`）。未設定の場合はプロセスごとにランダム生成され、再起動でセッションがリセットされます。 | プロセスごとにランダム |
| `DATABASE_URL` | SQLite ファイルの場所 | `file:/data/tally.db`（Docker） |
| `TZ` | 通知スケジューラーのタイムゾーン | `Asia/Tokyo` |
| `DISABLE_REGISTRATION` | `1` で最初のアカウント作成後の新規登録を無効化 | （未設定） |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | メール通知用の SMTP 設定（**フォールバック**。ユーザーごとの設定が優先） | （未設定） |
| `BACKUP_ENABLED` | 自動バックアップの有効／無効 | `true` |
| `BACKUP_INTERVAL_HOURS` | 自動バックアップの間隔（時間） | `24` |
| `BACKUP_KEEP` | 保持する世代数（超過分は古いものから削除） | `7` |
| `BACKUP_DIR` | バックアップの保存先 | DB と同じボリューム内の `backups/` |
| `PORT` | 待ち受けポート | `6400` |

!!! warning "本番では必ず SESSION_SECRET を設定"
    リポジトリは公開されているため、ハードコードされたフォールバック値は誰でも
    知り得ます。未設定のままだと Tally は**プロセスごと**にランダムな鍵を生成
    します（安全ですが、再起動のたびに全員ログアウトされます）。セッションを
    維持するには固定の鍵を設定してください。

秘密情報は `docker-compose.yml` と同じ場所に置く git 管理外の `.env` で渡します
（実際の秘密鍵はコミットしないこと）:

```bash
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env
```

`docker-compose.yml` はこれらを変数展開で読み込みます。例:

```yaml
environment:
  SESSION_SECRET: "${SESSION_SECRET:-}"
  TZ: "${TZ:-Asia/Tokyo}"
  DISABLE_REGISTRATION: "${DISABLE_REGISTRATION:-}"
```

## ユーザーごとの設定（アプリ内）

アプリの **設定** 画面で以下を変更できます:

- **言語** — 日本語 / English（ユーザーごと。サインアップ時にも選択）
- **メイン通貨** — 他通貨はこの通貨に換算して集計
- **月間予算** — ダッシュボードの予算バー・予算超過通知に使用
- **通知** — Discord / メール（＋ユーザーごと SMTP）/ 汎用 Webhook / Slack /
  ntfy、送信時刻・何日前（折りたたみセクション）
- **iCal カレンダー連携** — フィード URL の発行・再生成・無効化
- **バックアップ** — 状態確認と手動バックアップ
- **カテゴリ・支払い方法** — 編集可能なリスト（選んだ言語で初期化）
- **為替レート** — 手動更新
- **パスワード** — アカウントのパスワード変更

!!! tip "保存し忘れ防止"
    設定を保存せずに別ページへ移動しようとすると、保存するかどうか確認する
    ダイアログが表示されます。

## 公開インスタンスのロックダウン

Tally をインターネットに公開する場合:

1. 強い `SESSION_SECRET` を設定する。
2. 自分のアカウントを作成後、`DISABLE_REGISTRATION=1` を設定して再起動する。
3. HTTPS の背後に置く（リバースプロキシまたは Tailscale）。Tally は
   `x-forwarded-proto: https` を検知すると、自動でセッション Cookie に
   `Secure` を付与します。
