---
description: "建立新的 Tradovate trial 帳號(2 週試用),全程零瀏覽器純 API。可選 list/sweep/expire 管理現有帳號"
allowed-tools: Bash, Grep, Read
---

# ntv - New Tradovate Account

建立並管理 Tradovate 回放練習的 trial 試用帳號(每個 2 週)。

**輸入格式**: `$ARGUMENTS`(可選)

**子指令**:
- (無參數) — 建立一個新帳號
- `list` — 列出目前在用的帳號
- `sweep` — 把已過期的自動標為 expired
- `expire <email>` — 手動標某帳號為 expired

---

## 建立(無參數)

直接跑(整段約 10~30 秒,主要在等 mail.tm 收 Tradovate 寄出的 confirm 信):

```bash
bash ~/claude_work/scripts/tradovate-new.sh
```

`run_in_background: false`,timeout 360000(6 分鐘,腳本內預設 confirm 信等 300 秒)。

成功時 stdout 印 4 行(機器可讀):
```
NAME=NathanClark86
EMAIL=useroxktgymr3eep@wshu.net
PASSWORD=Yy7#Pg1c3gLb
USER_ID=7803353
```

回報給使用者時告知:
- **登入網址**: https://trader.tradovate.com/welcome
- **帳號(Username)**: `<NAME>`
- **密碼**: `<PASSWORD>`
- **試用到期**: +14 天

帳號已自動寫入 `~/claude_work/tradovate-accounts.tsv`,不必再手動記。

---

## 查在用帳號(`list`)

**用 Grep tool** 搜 `^active`,搜尋路徑 `~/claude_work/tradovate-accounts.tsv`,**不要 Read 整檔**(浪費 token)。

或 Bash:
```bash
rg '^active' ~/claude_work/tradovate-accounts.tsv
```

TSV 欄位順序(8 欄):
```
status  created_at  expires_at  name  email  tradovate_pw  mailtm_pw  notes
```

回報時整理成表格,**不要把 mailtm_pw 也秀**(那欄一般用不到,只在重收 confirm 信時用)。

---

## 過期掃描(`sweep`)

```bash
bash ~/claude_work/scripts/tradovate-accounts.sh sweep
```

stderr 會印「被改為 expired 的筆數」。回報給使用者即可。

---

## 手動過期(`expire <email>`)

```bash
bash ~/claude_work/scripts/tradovate-accounts.sh expire <email>
```

找不到對應 active 紀錄時 exit 1,如實回報。

---

## 例外處理

`tradovate-new.sh` 中途失敗(非 0 exit)看 stderr 判斷:

- **mail.tm 建信箱失敗** → 直接重跑一次
- **confirm 信超時(>300s)** → 重跑(可能 Tradovate 那次寄信沒成功)
- **signupwithemail 回 `errorCode != Success`** → 多半是 name 撞名,重跑(name 隨機+2 位數字)

**最多重試 2 次**。連續失敗就停下回報 stderr 給使用者,別硬幹。

---

## 相關檔案

| 檔案 | 角色 |
|------|------|
| `~/claude_work/scripts/tradovate-new.sh` | 一鍵新建(主入口) |
| `~/claude_work/scripts/tradovate-accounts.sh` | 台帳工具(add/list/expire/sweep) |
| `~/claude_work/scripts/mailtm.sh` | mail.tm 通用工具(被 new 內部呼叫) |
| `~/claude_work/scripts/tradovate-signup.sh` | signupwithemail API 包裝(被 new 內部呼叫) |
| `~/claude_work/tradovate-accounts.tsv` | 8 欄 TSV 台帳 |
| `~/claude_work/tech-notes/replay-signup-automation-notes.md` | 設計與沿革 |
