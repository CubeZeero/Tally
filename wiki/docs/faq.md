---
icon: lucide/circle-help
---

# よくある質問

??? question "Tally は単一ユーザーですか、マルチユーザーですか？"
    マルチユーザーです。アカウントごとにサブスク・カテゴリ・支払い方法・設定を
    保持します。最初のアカウントが既存データを引き継ぎます。

??? question "コンテナを再起動するたびにログアウトされます。"
    固定の `SESSION_SECRET` を設定していないため、Tally がプロセスごとに
    ランダムな鍵を使っています。`SESSION_SECRET` を設定してください（例:
    `.env` ファイル）。詳しくは [設定](configuration.md)。

??? question "ログインはできるのに、画面を移動するとログイン画面に戻されます。"
    `Secure` 付き Cookie を HTTP でアクセスした場合に起こります。Tally は
    `x-forwarded-proto: https` を検知したときのみ Cookie に `Secure` を付ける
    ため、直接 HTTP（例: Tailscale の IP）でも動作します。リバースプロキシを
    使う場合は、HTTPS でこのヘッダーを転送するよう設定してください。

??? question "メール通知が送信されません。"
    メールには SMTP 設定が必要です。**設定 → 通知 → メール通知**でユーザーごとに
    設定するか、サーバーの環境変数（`SMTP_HOST` など）をフォールバックとして
    使います。どちらも未設定だとメールはスキップされます。詳しくは
    [通知](notifications.md)。

??? question "Discord・メール以外の通知先はありますか？"
    はい。**汎用 Webhook**（Zapier / IFTTT / n8n など）・**Slack**・**ntfy**
    （スマホへプッシュ）に対応しています。複数を同時に有効化できます。詳しくは
    [通知](notifications.md)。

??? question "支払い日をカレンダーアプリで見られますか？"
    はい。**設定 → iCal カレンダー連携**でフィード URL を発行し、Google / Apple
    などのカレンダーで購読できます。詳しくは [機能](features.md)。

??? question "自動バックアップはありますか？"
    はい。SQLite を定期的に安全にバックアップします（既定で有効、保存先は
    ボリューム内の `backups/`）。間隔・世代数は `BACKUP_*` 環境変数で調整し、
    **設定 → バックアップ**から手動実行もできます。詳しくは
    [セルフホスト](self-hosting.md)。

??? question "スマホアプリはありますか？"
    Tally は **PWA** なので、ブラウザの「ホーム画面に追加」でアプリのように
    インストールできます（プッシュ通知は使いません）。

??? question "他の人が登録できないようにするには？"
    自分のアカウントを作成後、`DISABLE_REGISTRATION=1` を設定して再起動します。
    最初のアカウントは、初期セットアップのため常に作成できます。

??? question "Docker（Colima）に接続できないと表示されます。"
    Colima を使っている場合は `colima start`（自動起動なら
    `brew services start colima`）で起動してから `docker compose up -d` を
    実行してください。

??? question "データはどこに保存されますか？"
    `tally-data` ボリューム内の 1 つの SQLite ファイル（コンテナ内
    `/data/tally.db`）です。このファイルをコピーしてバックアップします。

??? question "言語を変えるには？"
    サインアップ時に選択するか、後から **設定 → 言語** で変更します。ユーザー
    ごとに保存され、デフォルトのカテゴリ / 支払い方法もその言語で初期化されます。
