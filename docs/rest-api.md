---
icon: lucide/code
---

# REST API

Tally の REST API は `/api/v1` から利用できます。リクエスト先はドキュメントサイトではなく、稼働中の Tally です。Docker の既定ポートは `6400` です。

!!! note "開発版の機能を含みます"
    接続先に実装されている操作は、その Tally の `/openapi.json` で確認できます。

## 認証

**環境設定 → MCP 連携** で発行したキーを `Authorization: Bearer <キー>` として送信します。

| キー | 権限 |
| --- | --- |
| API キー | 読み取りとインポートのプレビュー |
| REST API 書き込みキー | 読み取りに加え、サブスク・カテゴリ・支払い方法の変更 |

アクセスできるのはキーを発行したユーザー自身のデータです。キーは発行時に一度だけ表示され、同じ設定欄で個別に失効できます。リモート接続には HTTPS を使い、キーを URL や Git に含めないでください。

## リクエスト例

`TALLY_URL` を接続先に設定し、`TALLY_API_KEY` と `TALLY_WRITE_KEY` は手元のシェルに設定してください。

```bash
TALLY_URL=http://localhost:6400

curl -fsS -H "Authorization: Bearer ${TALLY_API_KEY}" \
  "${TALLY_URL}/api/v1/subscriptions?status=active&sort=next_payment"
```

```bash
curl -fsS -X POST "${TALLY_URL}/api/v1/subscriptions" \
  -H "Authorization: Bearer ${TALLY_WRITE_KEY}" \
  -H 'Content-Type: application/json' \
  --data '{"name":"Demo Video","cost":1200,"currency":"JPY","cycle":"month"}'
```

## エンドポイント

以下のパスには `/api/v1` を付けます。

| メソッドとパス | 内容 |
| --- | --- |
| `GET /subscriptions` | サブスク一覧・検索 |
| `GET /subscriptions/{id}` | サブスク詳細 |
| `GET /totals` | メイン通貨での月額・年額合計と予算 |
| `GET /upcoming-payments?days=30` | 有効なサブスクごとの次回支払日 |
| `GET /payment-schedule?start=2026-12-01&end=2026-12-31` | 期間内に発生するすべての請求予定と換算合計。両端を含む最大 366 日間 |
| `GET /reminders?days=14&kind=trial` | トライアル終了日または見直し期限。`kind` を省略すると両方を取得 |
| `GET /spend-breakdown?groupBy=category` | カテゴリ別または `groupBy=paymentMethod` で支払い方法別の月額・年額換算 |
| `GET /categories` / `GET /payment-methods` | カテゴリ・支払い方法の一覧 |
| `POST /subscriptions/import-preview` | CSV・JSON のインポート候補を保存せずに検証 |
| `POST /subscriptions` | サブスクを新規登録 |
| `PATCH /subscriptions/{id}` | 指定項目を編集。`{"active":false}` で停止、`{"active":true}` で再開 |
| `POST /subscriptions/{id}/duplicate` | サブスクを複製 |
| `DELETE /subscriptions/{id}` | サブスクを削除 |
| `POST /categories` / `POST /payment-methods` | `{"name":"…"}` で追加 |
| `PATCH /categories/{name}` / `PATCH /payment-methods/{name}` | `{"name":"新しい名前"}` で変更し、関連サブスクも更新 |
| `DELETE /categories/{name}` / `DELETE /payment-methods/{name}` | 削除。使用中の場合は `?replacement=移行先` で既存の項目へ付け替え |

名前をパスやクエリに渡す場合は URL エンコードしてください。検索には `q`、`category`、`paymentMethod`、`status`（`active` / `paused`）、`minMonthlyCost`、`maxMonthlyCost` が使えます。料金の絞り込みはメイン通貨での月額換算です。`sort` は `name`、`monthly_cost_asc`、`monthly_cost_desc`、`next_payment` に対応します。

## インポートのプレビュー

`POST /api/v1/subscriptions/import-preview` に `format` とファイル内容を文字列にした `content` を送ります。

```json
{
  "format": "csv",
  "content": "name,cost,currency\nDemo Music,980,JPY"
}
```

`format: "json"` の場合は、配列または `subscriptions` 配列を含むオブジェクトを文字列で送ります。最大 500 件を検証し、`wouldCreate`、`duplicateCount`、`invalidCount` と行ごとの結果を返します。重複候補は既存サブスクや入力内の同名レコードで判定します。

## 主なステータスコード

| コード | 意味 |
| --- | --- |
| `200` / `201` / `204` | 成功・作成・削除完了（本文なし） |
| `400` | 入力またはクエリが不正 |
| `401` | キーが未指定・無効・失効済み |
| `403` | 書き込みキーが必要 |
| `404` | 対象が存在しないか、自分のアカウントに属していない |
| `409` | 同名の項目があるか、使用中の項目の削除に移行先が必要 |

AI アシスタントから操作する場合は [MCP 連携](mcp.md) を参照してください。
