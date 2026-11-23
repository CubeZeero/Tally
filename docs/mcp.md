---
icon: lucide/plug
---

# MCP 連携

Tally は `/api/mcp` で Streamable HTTP の MCP サーバーを提供します。AI アシスタントから自分のサブスクリプション情報を参照でき、OAuth で書き込みを許可すると、サブスクやカテゴリ、支払い方法も管理できます。

!!! note "開発版の機能を含みます"
    実際に使えるツールは、接続先の Tally のバージョンで確認してください。

## 読み取りツール

| ツール | 内容 |
| --- | --- |
| `list_subscriptions` | 名前（`q`）、カテゴリ、支払い方法、稼働状態、月額換算料金で絞り込み。名前順・料金順・次回支払日順に並べ替え。 |
| `get_subscription` | ID を指定してサブスクを 1 件取得。 |
| `get_totals` | 月額・年額の支出合計と予算状況を取得。 |
| `get_upcoming_payments` | 指定日数以内の次回支払いを有効なサブスクごとに取得。 |
| `get_payment_schedule` | `start`〜`end` の最大 366 日間に発生するすべての請求予定と換算合計を取得。 |
| `get_subscription_reminders` | トライアル終了日と見直し期限を取得。`kind: "trial"` または `kind: "review"` で絞り込み。 |
| `get_spend_breakdown` | カテゴリ別または支払い方法別の月額・年額換算を取得。 |
| `list_categories` / `list_payment_methods` | カテゴリと支払い方法の一覧。 |
| `preview_subscription_import` | CSV・JSON を最大 500 件検証。登録可能な行、同名の重複候補、入力エラーを保存せずに確認。 |

## 書き込みツール

OAuth の同意画面で `tally:write` を許可すると、以下のツールが使えます。

| ツール | 内容 |
| --- | --- |
| `create_subscription` | サブスクを新規登録。 |
| `update_subscription` | 指定した項目だけを編集。 |
| `toggle_subscription` | サブスクを停止または再開。 |
| `duplicate_subscription` | 既存サブスクを複製して新規登録。 |
| `manage_subscription_label` | カテゴリや支払い方法の追加・名前変更・削除。名前変更は関連サブスクにも反映され、使用中の項目を削除するには既存の移行先が必要。 |

サブスクそのものの削除は [REST API](rest-api.md) から行えます。

## クライアントを接続

- **API キー（読み取り）** — **環境設定 → MCP 連携**で読み取りキーを発行し、発行時に控えます。クライアントの URL に `https://<host>/api/mcp` を指定し、`Authorization: Bearer <API キー>` を送ります。既存キーもアップグレード後にヘッダーで使えます。
- **OAuth（読み取り・書き込み）** — 同じエンドポイントを登録し、ログインして認可します。HTTPS を使い、外部からアクセスするオリジンを `TALLY_PUBLIC_URL` に設定します。書き込みは `tally:write` を明示的に要求して許可した場合に使えます。

キーを埋め込んだ旧 URL を設定済みの場合は、上記のいずれかに切り替えてください。アップグレード後は OAuth の再認可が必要です。

## LAN・Tailscale から接続

手元の端末で動くクライアントが Streamable HTTP と HTTP URL、Bearer ヘッダーに対応していれば、`http://192.168.1.20:6400/api/mcp` や `http://100.x.x.x:6400/api/mcp` に読み取りキーで接続できます。独自ドメインは不要です。OAuth で接続する場合は HTTPS を使い、リバースプロキシから接続先のホスト名とスキームを正しく転送してください。

## クライアント別の設定

- Codex など HTTP ヘッダーを設定できるクライアントでは、**ストリーミング可能な HTTP** を選び、Tally のエンドポイントと読み取り用 Bearer ヘッダーを指定します。
- クラウド上のコネクタや書き込み操作には OAuth を使い、クライアントから HTTPS エンドポイントに到達できるようにします。stdio 専用クライアントの場合は、HTTP ヘッダーを設定できるローカル中継を使います。

## 公開 HTTPS 化 { #https }

ChatGPT や claude.ai（web）のコネクタは **Anthropic / OpenAI 側から** Tally に
接続するため、インスタンスをインターネットから HTTPS で到達可能にする必要が
あります（Web UI を公開するのと同じ作業）。代表的な手段:

- **Cloudflare Tunnel** — ポート開放不要で独自ドメインに公開。無料。
- **リバースプロキシ ＋ Let's Encrypt**（Caddy / nginx）＋ 独自ドメイン。
- **Tailscale Funnel** — `.ts.net` を公開 HTTPS 化。

!!! important "SESSION_SECRET を固定する"
    OAuth のトークンとログインセッションは `SESSION_SECRET` で署名されます。値を
    設定しないとプロセスごとにランダム生成され、**再起動のたびに再認可・再ログイン**
    が必要になります。安定運用には必ず設定してください（[設定](configuration.md)参照）。

## トラブルシュートと失効

- クラウド上のコネクタから接続できない場合は、設定した HTTPS エンドポイントにコネクタ側から到達できるか確認します。手元のクライアントなら、LAN・Tailscale 経由でも接続できます。
- Bearer 接続が `401` を返す場合は、キーと `/api/mcp` の URL を確認してください。キーの再発行・失効により、それまでのキーは無効になります。
- アップグレード後に OAuth が使えない場合は、ログインして再認可します。`SESSION_SECRET` を固定し、認可フローでは同じ外部オリジンを使ってください。
