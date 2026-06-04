#!/usr/bin/env bash
# tradovate-new.sh — 一鍵建立一個新的 Tradovate trial 帳號(全程零瀏覽器)
#
# ⚠️ 去識別化版本：API 路徑已替換為虛構路徑，不能在公開平台透露第三方服務的內部 API path
#
# 步驟(內部串接):
#   1. mailtm.sh create                            → 建拋棄式信箱
#   2. POST /v1/auth/verify-email                  → 觸發寄 confirm 信（虛構路徑）
#   3. mailtm.sh wait --match signupWithEmail      → 抓 confirm 連結
#   4. tradovate-signup.sh --url <link>            → 完成註冊（虛構路徑）
#   5. tradovate-accounts.sh add (由 step 4 內部呼叫)
#
# 用法:
#   bash tradovate-new.sh [--name <name>] [--password <pw>] [--timeout <sec=300>]
#
# 成功:exit 0,stdout 印 NAME / EMAIL / PASSWORD / USER_ID(可 eval 取用)
# 失敗:exit 非 0,stderr 印錯誤
set -euo pipefail

DIR="$(dirname "$0")"
# ⚠️ 虛構路徑，實際路徑透過 /sniff 逆向取得
VERIFY_ENDPOINT="https://api.example.com/v1/auth/verify-email"
LINK_REGEX='example\.com/signupWithEmail'

die() { echo "[ERROR] $*" >&2; exit 1; }

# ---------- 參數 ----------
NAME_OPT="" PASSWORD_OPT="" TIMEOUT=300
while (( $# > 0 )); do
  case "$1" in
    --name)     NAME_OPT="$2";     shift 2 ;;
    --password) PASSWORD_OPT="$2"; shift 2 ;;
    --timeout)  TIMEOUT="$2";      shift 2 ;;
    *) die "未知參數: $1" ;;
  esac
done

# ---------- 1. 建信箱 ----------
echo "[new] 1/4 建立 mail.tm 信箱..." >&2
eval "$(bash "$DIR/mailtm.sh" create)"
echo "[new]     EMAIL=$EMAIL" >&2

# ---------- 2. 觸發驗證信 ----------
echo "[new] 2/4 觸發驗證信..." >&2
VERIFY_BODY=$(node -e '
  process.stdout.write(JSON.stringify({
    email: process.argv[1],
    locale: "en",
    heapUserId: "",
    landingParams: "camp=trial",
  }));
' "$EMAIL")

VERIFY_RESP=$(curl -sS -w '\n%{http_code}' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d "$VERIFY_BODY" "$VERIFY_ENDPOINT")
VERIFY_BODY_RESP=$(printf '%s' "$VERIFY_RESP" | sed '$d')
VERIFY_CODE=$(printf '%s' "$VERIFY_RESP" | tail -n1)
[[ "$VERIFY_CODE" == "200" ]] || die "驗證信觸發失敗 HTTP $VERIFY_CODE body=$VERIFY_BODY_RESP"
echo "[new]     OK ($VERIFY_BODY_RESP)" >&2

# ---------- 3. 等 confirm 信 ----------
echo "[new] 3/4 等 confirm 信(最多 ${TIMEOUT}s)..." >&2
LINK=$(bash "$DIR/mailtm.sh" wait \
  --token "$TOKEN" \
  --match "$LINK_REGEX" \
  --timeout "$TIMEOUT" | sed -n 's/^LINK=//p')
[[ -n "$LINK" ]] || die "未抓到 confirm 連結"
echo "[new]     拿到 link(長度 ${#LINK})" >&2

# ---------- 4. 完成 signup ----------
echo "[new] 4/4 完成註冊..." >&2
SIGNUP_ARGS=(--url "$LINK" --mailtm-pw "$PASSWORD")
[[ -n "$NAME_OPT"     ]] && SIGNUP_ARGS+=(--name "$NAME_OPT")
[[ -n "$PASSWORD_OPT" ]] && SIGNUP_ARGS+=(--password "$PASSWORD_OPT")

bash "$DIR/tradovate-signup.sh" "${SIGNUP_ARGS[@]}"
