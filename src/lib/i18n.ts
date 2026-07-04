export const LANGUAGES = ["ja", "en"] as const;
export type Lang = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Lang, string> = {
  ja: "日本語",
  en: "English",
};

export function normalizeLang(v: string | undefined | null): Lang {
  // Default to English when no explicit preference is set.
  return v === "ja" ? "ja" : "en";
}

type Dict = Record<string, string>;

const ja: Dict = {
  // meta / common
  "app.title": "Tally — サブスクリプション管理",
  "app.desc": "セルフホスト型のサブスクリプション追跡ダッシュボード",
  "common.total": "合計",
  "common.today": "本日",
  "common.none": "—",
  "common.cancel": "キャンセル",
  "common.save": "保存",
  "common.saved": "保存しました。",
  "common.saving": "保存中…",
  "common.delete": "削除",
  "common.deleteDo": "削除する",
  "common.edit": "編集",
  "common.close": "閉じる",
  "common.optional": "任意",
  "common.unselected": "未選択",
  "common.uncategorized": "未分類",

  // nav
  "nav.dashboard": "ダッシュボード",
  "nav.dashboard.sub": "毎月の支出を把握",
  "nav.subscriptions": "サブスク一覧",
  "nav.subscriptions.sub": "登録した契約を管理",
  "nav.calendar": "カレンダー",
  "nav.calendar.sub": "支払い日を月表示",
  "nav.stats": "統計",
  "nav.stats.sub": "費用の分析",
  "nav.settings": "設定",
  "nav.settings.sub": "通貨・通知・カテゴリ",
  "nav.about": "About",
  "nav.about.sub": "Tally について",
  "nav.short.dashboard": "概要",
  "nav.short.subscriptions": "一覧",
  "nav.short.calendar": "暦",
  "nav.short.stats": "統計",
  "nav.short.settings": "設定",
  "nav.short.about": "情報",
  "nav.logout": "ログアウト",
  "nav.themeToggle": "テーマ切替",

  // auth
  "auth.welcome": "ようこそ",
  "auth.welcomeBack": "おかえりなさい",
  "auth.setupTitle": "TALLY を\nはじめる",
  "auth.loginTitle": "TALLY に\nログイン",
  "auth.setupDesc":
    "管理用のパスワードを設定してください。あなたのサブスクリプション情報はこのサーバー内にのみ保存されます。",
  "auth.loginDesc": "設定したパスワードを入力してダッシュボードへ進みます。",
  "auth.password": "パスワード",
  "auth.passwordConfirm": "パスワード（確認）",
  "auth.setupButton": "パスワードを設定する",
  "auth.loginButton": "ログイン",
  "auth.processing": "処理中…",
  "auth.err.short": "パスワードは8文字以上にしてください。",
  "auth.err.mismatch": "パスワードが一致しません。",
  "auth.err.wrong": "パスワードが正しくありません。",
  "auth.username": "ユーザー名",
  "auth.registerTitle": "アカウント\n作成",
  "auth.registerDesc":
    "ユーザー名とパスワードを設定してアカウントを作成します。データはこのサーバー内にのみ保存されます。",
  "auth.registerButton": "アカウントを作成",
  "auth.noAccount": "アカウントをお持ちでない場合",
  "auth.haveAccount": "すでにアカウントをお持ちの場合",
  "auth.toLogin": "ログイン",
  "auth.toRegister": "新規登録",
  "auth.err.usernameShort": "ユーザー名は3文字以上にしてください。",
  "auth.err.taken": "そのユーザー名は既に使われています。",
  "auth.err.wrongLogin": "ユーザー名またはパスワードが正しくありません。",
  "auth.err.registrationClosed": "このサーバーでは新規登録が無効になっています。",

  // dashboard
  "dash.monthlySpend": "今月の支出",
  "dash.managingPre": "現在",
  "dash.managingPost": "件のサブスクリプションを管理中。年間では",
  "dash.managingEnd": "の支出が見込まれます。",
  "dash.unconvertible": "件は為替レート未取得のため合計に含めていません。",
  "dash.manage": "サブスクを管理",
  "dash.addNew": "+ 新規追加",
  "stat.monthlyTotal": "月額合計",
  "stat.yearlyTotal": "年額合計",
  "stat.count": "契約数",
  "stat.countAll": "全 {n} 件",
  "stat.nextPayment": "次回支払い",
  "dash.upcoming": "次の支払い予定",
  "dash.viewAll": "すべて表示 →",
  "dash.byCategory": "カテゴリ別（月額）",
  "dash.noData": "まだデータがありません。",
  "dash.addFirst": "+ 最初のサブスクを追加",

  // subscriptions
  "subs.registered": "登録済み",
  "subs.countTitle": "{n} サブスクリプション",
  "subs.add": "+ 追加",
  "subs.empty": "まだサブスクリプションがありません。",
  "subs.addFirstOne": "最初のひとつを追加",
  "subs.pause": "停止",
  "subs.resume": "再開",
  "subs.monthly": "月額",
  "subs.rateMissing": "レート未取得",
  "subs.sortBy": "並べ替え",
  "sort.next": "支払日が近い順",
  "sort.priceDesc": "月額が高い順",
  "sort.priceAsc": "月額が安い順",
  "sort.name": "名前順",
  "sort.created": "追加順",

  // subscription dialog
  "dlg.newTitle": "新しいサブスク",
  "dlg.editTitle": "編集",
  "dlg.name": "名称",
  "dlg.icon": "サービスアイコン",
  "dlg.iconSearch": "例: netflix / spotify を検索",
  "dlg.iconClear": "解除",
  "dlg.iconImage": "画像をアップロード",
  "dlg.cost": "料金",
  "dlg.currency": "通貨",
  "dlg.currencyMain": "メイン ({c})",
  "dlg.cycle": "周期",
  "dlg.interval": "間隔（N周期ごと）",
  "dlg.startDate": "支払い開始日",
  "dlg.nextDate": "次回支払日（任意）",
  "dlg.nextHint":
    "次回支払日を指定すると、その日付を基準に次の支払いを計算します（未入力なら開始日から自動計算）。",
  "dlg.category": "カテゴリ",
  "dlg.paymentMethod": "支払い方法",
  "dlg.notInList": "（一覧にない）",
  "dlg.url": "URL",
  "dlg.memo": "メモ",
  "dlg.accent": "アクセントカラー",
  "dlg.active": "有効",
  "dlg.create": "追加する",
  "dlg.update": "更新する",
  "dlg.deleteTitle": "サブスクを削除",
  "dlg.deleteMsg": "「{name}」を削除しますか？この操作は取り消せません。",

  // settings
  "set.title": "環境設定",
  "set.eyebrow": "設定",
  "set.basic": "基本",
  "set.mainCurrency": "メイン通貨",
  "set.mainCurrencyHint": "他通貨のサブスクはこの通貨に換算して集計されます。",
  "set.language": "言語",
  "set.notify": "通知",
  "set.webhook": "Discord Webhook URL",
  "set.notifyEnabled": "毎日この時刻に支払い予定を自動で Discord 通知する",
  "set.sendTime": "送信時刻",
  "set.daysBefore": "何日前まで通知",
  "set.tzHint": "時刻はサーバーのタイムゾーン（既定: Asia/Tokyo）に従います。",
  "set.testSend": "今すぐテスト送信",
  "set.testSent": "送信しました。Discord を確認してください。",
  "set.security": "セキュリティ",
  "set.account": "ログイン中のユーザー",
  "set.changePassword": "パスワード変更（空欄なら変更しない）",
  "set.newPasswordPh": "新しいパスワード（8文字以上）",
  "set.saveButton": "設定を保存",
  "set.err.passwordShort": "新しいパスワードは8文字以上にしてください。",
  "set.err.badWebhook":
    "Discord の Webhook URL が正しくありません（https://discord.com/api/webhooks/... の形式）。",
  "set.rates": "為替レート",
  "set.ratesUpdated": "最終更新:",
  "set.ratesNever": "未取得",
  "set.refreshRates": "レートを今すぐ更新",
  "set.refreshed": "更新しました。",
  "set.ratesFailed":
    "為替レートの取得に失敗しました（ネットワークを確認してください）。",
  "set.categories": "カテゴリ",
  "set.paymentMethods": "支払い方法",
  "list.empty": "項目がありません。",
  "list.addNew": "新しい項目を追加",
  "list.add": "追加",
  "list.deleteTitle": "{title}を削除",
  "list.deleteMsg": "「{name}」を削除しますか？",

  // data import/export
  "data.title": "データの書き出し / 読み込み",
  "data.export": "書き出し（エクスポート）",
  "data.exportCsv": "CSV を書き出し",
  "data.exportJson": "JSON を書き出し",
  "data.import": "読み込み（インポート）",
  "data.replace": "インポート前に既存のサブスクをすべて削除する",
  "data.importButton": "ファイルから読み込む",
  "data.importing": "読み込み中…",
  "data.importedN": "{n} 件のサブスクを読み込みました。",
  "data.hint": "CSV / JSON 形式に対応。書き出したファイルをそのまま読み込めます。",
  "data.replaceTitle": "既存データを置き換え",
  "data.replaceMsg":
    "現在のサブスクをすべて削除してからインポートします。よろしいですか？",
  "data.replaceDo": "置き換える",
  "data.err.noFile": "ファイルを選択してください。",
  "data.err.parse": "解析に失敗しました",
  "data.err.empty": "有効なデータが見つかりませんでした。",
  "data.err.auth": "認証が必要です。",

  // calendar
  "cal.eyebrow": "カレンダー",
  "cal.monthTitle": "{y}年 {m}月",
  "cal.monthTotal": "今月の支払い見込み:",
  "cal.prev": "← 前月",
  "cal.thisMonth": "今月",
  "cal.next": "翌月 →",
  "cal.dayPayments": "{y}年 {m}月 {d}日 の支払い",
  "cal.noPayments": "この日の支払いはありません。",

  // stats
  "stats.eyebrow": "統計",
  "stats.title": "費用の分析",
  "stats.avgMonthly": "月額平均（合計）",
  "stats.yearly": "年間費用",
  "stats.perItem": "1件あたり月額平均",
  "stats.itemsN": "{n} 件",
  "stats.max": "最高額（月額換算）",
  "stats.forecast": "今後12ヶ月の支払い見込み（月別）",
  "stats.ranking": "高額ランキング（月額換算）",
  "stats.byCategory": "カテゴリ別（月額）",
  "stats.byPayment": "支払い方法別（月額）",
  "stats.pmUnset": "未設定",
  "stats.perMonth": "/月",

  // about
  "about.eyebrow": "About",
  "about.desc":
    "セルフホスト可能なサブスクリプション管理ダッシュボード。契約中のサービスの料金・更新日・支出をひと目で把握できます。",
  "about.version": "バージョン {v}",
  "about.features": "主な機能",
  "about.status": "現在の状況",
  "about.registered": "登録サブスク",
  "about.active": "有効",
  "about.stack": "技術スタック",
  "about.toDashboard": "ダッシュボードへ",

  // account / language
  "auth.language": "言語",
  // email notifications
  "set.emailNotify": "メール通知",
  "set.email": "通知先メールアドレス",
  "set.emailEnabled": "支払い予定をメールでも通知する",
  "set.smtpNote": "メール送信にはサーバー側の SMTP 設定（環境変数）が必要です。",
  "set.err.badEmail": "メールアドレスの形式が正しくありません。",
  // free trial
  "dlg.trial": "無料トライアル",
  "dlg.trialEnd": "トライアル終了日（初回課金日）",
  "dlg.trialHint":
    "設定すると、その日までは無料として合計から除外し、終了日を初回課金として計上・通知します。",
  "subs.trial": "トライアル",
  "subs.trialEndsPrefix": "無料期間 〜",
  // search / filter
  "subs.search": "検索",
  "subs.filterAll": "すべて",
  "subs.filterActive": "有効",
  "subs.filterPaused": "停止中",
  "subs.filterTrial": "トライアル",
  "subs.noMatch": "該当するサブスクがありません。",
  // cycles
  "cycle.day": "日ごと",
  "cycle.week": "週ごと",
  "cycle.month": "月ごと",
  "cycle.year": "年ごと",
};

const en: Dict = {
  "app.title": "Tally — Subscription Manager",
  "app.desc": "Self-hosted subscription tracking dashboard",
  "common.total": "Total",
  "common.today": "Today",
  "common.none": "—",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.saved": "Saved.",
  "common.saving": "Saving…",
  "common.delete": "Delete",
  "common.deleteDo": "Delete",
  "common.edit": "Edit",
  "common.close": "Close",
  "common.optional": "optional",
  "common.unselected": "None",
  "common.uncategorized": "Uncategorized",

  "nav.dashboard": "Dashboard",
  "nav.dashboard.sub": "Track monthly spend",
  "nav.subscriptions": "Subscriptions",
  "nav.subscriptions.sub": "Manage your plans",
  "nav.calendar": "Calendar",
  "nav.calendar.sub": "Payments by month",
  "nav.stats": "Statistics",
  "nav.stats.sub": "Cost analysis",
  "nav.settings": "Settings",
  "nav.settings.sub": "Currency, alerts, categories",
  "nav.about": "About",
  "nav.about.sub": "About Tally",
  "nav.short.dashboard": "Home",
  "nav.short.subscriptions": "List",
  "nav.short.calendar": "Cal",
  "nav.short.stats": "Stats",
  "nav.short.settings": "Settings",
  "nav.short.about": "About",
  "nav.logout": "Log out",
  "nav.themeToggle": "Toggle theme",

  "auth.welcome": "Welcome",
  "auth.welcomeBack": "Welcome back",
  "auth.setupTitle": "GET STARTED\nWITH TALLY",
  "auth.loginTitle": "LOG IN TO\nTALLY",
  "auth.setupDesc":
    "Set an admin password. Your subscription data is stored only on this server.",
  "auth.loginDesc": "Enter your password to continue to the dashboard.",
  "auth.password": "Password",
  "auth.passwordConfirm": "Password (confirm)",
  "auth.setupButton": "Set password",
  "auth.loginButton": "Log in",
  "auth.processing": "Processing…",
  "auth.err.short": "Password must be at least 8 characters.",
  "auth.err.mismatch": "Passwords do not match.",
  "auth.err.wrong": "Incorrect password.",
  "auth.username": "Username",
  "auth.registerTitle": "CREATE\nACCOUNT",
  "auth.registerDesc":
    "Create an account with a username and password. Your data is stored only on this server.",
  "auth.registerButton": "Create account",
  "auth.noAccount": "Don't have an account?",
  "auth.haveAccount": "Already have an account?",
  "auth.toLogin": "Log in",
  "auth.toRegister": "Sign up",
  "auth.err.usernameShort": "Username must be at least 3 characters.",
  "auth.err.taken": "That username is already taken.",
  "auth.err.wrongLogin": "Incorrect username or password.",
  "auth.err.registrationClosed": "Registration is disabled on this server.",

  "dash.monthlySpend": "This month's spend",
  "dash.managingPre": "Managing",
  "dash.managingPost": "subscriptions. Annually that's about",
  "dash.managingEnd": "in projected spend.",
  "dash.unconvertible": "item(s) excluded from the total (no exchange rate).",
  "dash.manage": "Manage subscriptions",
  "dash.addNew": "+ Add new",
  "stat.monthlyTotal": "Monthly total",
  "stat.yearlyTotal": "Yearly total",
  "stat.count": "Active",
  "stat.countAll": "{n} total",
  "stat.nextPayment": "Next payment",
  "dash.upcoming": "Upcoming payments",
  "dash.viewAll": "View all →",
  "dash.byCategory": "By category (monthly)",
  "dash.noData": "No data yet.",
  "dash.addFirst": "+ Add your first subscription",

  "subs.registered": "Registered",
  "subs.countTitle": "{n} subscriptions",
  "subs.add": "+ Add",
  "subs.empty": "No subscriptions yet.",
  "subs.addFirstOne": "Add your first one",
  "subs.pause": "Pause",
  "subs.resume": "Resume",
  "subs.monthly": "Monthly",
  "subs.rateMissing": "No rate",
  "subs.sortBy": "Sort",
  "sort.next": "Next payment (soonest)",
  "sort.priceDesc": "Monthly (high → low)",
  "sort.priceAsc": "Monthly (low → high)",
  "sort.name": "Name",
  "sort.created": "Date added",

  "dlg.newTitle": "New subscription",
  "dlg.editTitle": "Edit",
  "dlg.name": "Name",
  "dlg.icon": "Service icon",
  "dlg.iconSearch": "Search e.g. netflix / spotify",
  "dlg.iconClear": "Clear",
  "dlg.iconImage": "Upload image",
  "dlg.cost": "Price",
  "dlg.currency": "Currency",
  "dlg.currencyMain": "Main ({c})",
  "dlg.cycle": "Cycle",
  "dlg.interval": "Every N cycles",
  "dlg.startDate": "Start date",
  "dlg.nextDate": "Next payment date (optional)",
  "dlg.nextHint":
    "If set, the next payment is calculated from this date (otherwise from the start date).",
  "dlg.category": "Category",
  "dlg.paymentMethod": "Payment method",
  "dlg.notInList": " (not in list)",
  "dlg.url": "URL",
  "dlg.memo": "Note",
  "dlg.accent": "Accent color",
  "dlg.active": "Active",
  "dlg.create": "Add",
  "dlg.update": "Update",
  "dlg.deleteTitle": "Delete subscription",
  "dlg.deleteMsg": "Delete “{name}”? This cannot be undone.",

  "set.title": "Settings",
  "set.eyebrow": "Settings",
  "set.basic": "General",
  "set.mainCurrency": "Main currency",
  "set.mainCurrencyHint":
    "Subscriptions in other currencies are converted to this for totals.",
  "set.language": "Language",
  "set.notify": "Notifications",
  "set.webhook": "Discord Webhook URL",
  "set.notifyEnabled": "Send upcoming payments to Discord daily at this time",
  "set.sendTime": "Send time",
  "set.daysBefore": "Notify days ahead",
  "set.tzHint": "Time follows the server timezone (default: Asia/Tokyo).",
  "set.testSend": "Send test now",
  "set.testSent": "Sent. Check Discord.",
  "set.security": "Security",
  "set.account": "Signed in as",
  "set.changePassword": "Change password (leave blank to keep)",
  "set.newPasswordPh": "New password (8+ characters)",
  "set.saveButton": "Save settings",
  "set.err.passwordShort": "New password must be at least 8 characters.",
  "set.err.badWebhook":
    "Invalid Discord webhook URL (expected https://discord.com/api/webhooks/...).",
  "set.rates": "Exchange rates",
  "set.ratesUpdated": "Last updated:",
  "set.ratesNever": "Never",
  "set.refreshRates": "Refresh rates now",
  "set.refreshed": "Updated.",
  "set.ratesFailed": "Failed to fetch rates (check your network).",
  "set.categories": "Categories",
  "set.paymentMethods": "Payment methods",
  "list.empty": "No items.",
  "list.addNew": "Add a new item",
  "list.add": "Add",
  "list.deleteTitle": "Delete {title}",
  "list.deleteMsg": "Delete “{name}”?",

  "data.title": "Export / Import data",
  "data.export": "Export",
  "data.exportCsv": "Export CSV",
  "data.exportJson": "Export JSON",
  "data.import": "Import",
  "data.replace": "Delete all existing subscriptions before importing",
  "data.importButton": "Import from file",
  "data.importing": "Importing…",
  "data.importedN": "Imported {n} subscriptions.",
  "data.hint": "Supports CSV / JSON. Exported files can be re-imported directly.",
  "data.replaceTitle": "Replace existing data",
  "data.replaceMsg":
    "This deletes all current subscriptions before importing. Continue?",
  "data.replaceDo": "Replace",
  "data.err.noFile": "Please choose a file.",
  "data.err.parse": "Failed to parse",
  "data.err.empty": "No valid data found.",
  "data.err.auth": "Authentication required.",

  "cal.eyebrow": "Calendar",
  "cal.monthTitle": "{m}/{y}",
  "cal.monthTotal": "Projected this month:",
  "cal.prev": "← Prev",
  "cal.thisMonth": "Today",
  "cal.next": "Next →",
  "cal.dayPayments": "Payments on {m}/{d}/{y}",
  "cal.noPayments": "No payments on this day.",

  "stats.eyebrow": "Statistics",
  "stats.title": "Cost analysis",
  "stats.avgMonthly": "Monthly total",
  "stats.yearly": "Yearly cost",
  "stats.perItem": "Avg per subscription",
  "stats.itemsN": "{n} items",
  "stats.max": "Most expensive (monthly)",
  "stats.forecast": "Next 12 months (by month)",
  "stats.ranking": "Top by cost (monthly)",
  "stats.byCategory": "By category (monthly)",
  "stats.byPayment": "By payment method (monthly)",
  "stats.pmUnset": "Unset",
  "stats.perMonth": "/mo",

  "about.eyebrow": "About",
  "about.desc":
    "A self-hostable subscription manager. See your plans' cost, renewal dates, and spend at a glance.",
  "about.version": "Version {v}",
  "about.features": "Features",
  "about.status": "Current status",
  "about.registered": "Subscriptions",
  "about.active": "Active",
  "about.stack": "Tech stack",
  "about.toDashboard": "Go to dashboard",

  "auth.language": "Language",
  "set.emailNotify": "Email notifications",
  "set.email": "Notification email address",
  "set.emailEnabled": "Also send upcoming payments by email",
  "set.smtpNote": "Email delivery requires server-side SMTP configuration (env vars).",
  "set.err.badEmail": "Invalid email address.",
  "dlg.trial": "Free trial",
  "dlg.trialEnd": "Trial end date (first charge)",
  "dlg.trialHint":
    "If set, it's excluded from totals as free until this date, then counted/notified as the first charge.",
  "subs.trial": "Trial",
  "subs.trialEndsPrefix": "Free until",
  "subs.search": "Search",
  "subs.filterAll": "All",
  "subs.filterActive": "Active",
  "subs.filterPaused": "Paused",
  "subs.filterTrial": "Trial",
  "subs.noMatch": "No matching subscriptions.",
  "cycle.day": "Daily",
  "cycle.week": "Weekly",
  "cycle.month": "Monthly",
  "cycle.year": "Yearly",
};

const DICTS: Record<Lang, Dict> = { ja, en };

export type TFunc = (key: string, vars?: Record<string, string | number>) => string;

export function getT(lang: Lang): TFunc {
  const d = DICTS[lang];
  return (key, vars) => {
    let s = d[key] ?? ja[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = s.replaceAll(`{${k}}`, String(v));
      }
    }
    return s;
  };
}

export function locale(lang: Lang): string {
  return lang === "en" ? "en-US" : "ja-JP";
}

/** Locale-aware date formatting. */
export function fmtDate(
  date: Date,
  lang: Lang,
  opts: Intl.DateTimeFormatOptions,
): string {
  return date.toLocaleDateString(locale(lang), opts);
}

/** "Today" / "in N days" style relative label. */
export function relDays(d: number, lang: Lang): string {
  if (d <= 0) return lang === "en" ? "Today" : "本日";
  return lang === "en" ? `in ${d}d` : `${d}日後`;
}

export function cycleLabel(
  cycle: string,
  count: number,
  lang: Lang,
): string {
  const t = getT(lang);
  const base = t(`cycle.${cycle}`);
  if (count <= 1) return base;
  if (lang === "en") {
    const unit = { day: "days", week: "weeks", month: "months", year: "years" }[
      cycle
    ];
    return `every ${count} ${unit}`;
  }
  const unit = { day: "日", week: "週", month: "ヶ月", year: "年" }[cycle];
  return `${count}${unit}ごと`;
}
