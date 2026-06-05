#!/usr/bin/env bash
# tradovate-signup.sh — 完成 Tradovate 試用帳號建立(第三步)
#
# ⚠️ 去識別化版本：API 路徑已替換為虛構路徑，不能在公開平台透露第三方服務的內部 API path
#
# 前置條件:
#   - 已用 mailtm.sh 建好信箱(mail.tm)
#   - 已用驗證信 API 寄出 confirm 信
#   - 已用 mailtm.sh wait 抓到 confirm 連結,內含 ?t=<token>&email=<email>
#
# 本工具:
#   1. 從輸入解出 t-token + email(可給整條 URL,或 t 與 email 分開給)
#   2. 自動生成正常感的 name + 強密碼
#   3. POST 到註冊 API 完成帳號建立（虛構路徑）
#   4. 成功 → 自動寫入 tradovate-accounts.tsv(透過 tradovate-accounts.sh add)
#
# 用法:
#   tradovate-signup.sh --url '<完整 confirm URL>' --mailtm-pw <mailtm 密碼> [--name <自訂名稱>] [--password <自訂密碼>]
#   tradovate-signup.sh --email <email> --t <token>  --mailtm-pw <密碼> [--name ...] [--password ...]
#
# 成功:exit 0,stdout 印 NAME / EMAIL / PASSWORD / USER_ID
# 失敗:exit 非 0,stderr 印錯誤
set -euo pipefail

# ⚠️ 虛構路徑，實際路徑透過 /sniff 逆向取得
ENDPOINT="https://api.example.com/v1/auth/signup-with-email"
TAC_DATE="22 September 2025"

ACCOUNTS_SH="$(dirname "$0")/tradovate-accounts.sh"

die() { echo "[ERROR] $*" >&2; exit 1; }

# 從 URL 取 query 參數值;node 處理 url-decode
url_param() {  # $1=url $2=key
  node -e '
    const u = new URL(process.argv[1]);
    const v = u.searchParams.get(process.argv[2]);
    if (v === null) process.exit(2);
    process.stdout.write(v);
  ' "$1" "$2"
}

# 生成正常感的名字(First + Last + 2 digits)
gen_name() {
  local first last suffix
  local firsts=(Alex Sarah Michael Emma Daniel Olivia James Sophia William Ava Ryan Mia Ethan Chloe Nathan Lily)
  local lasts=(Smith Johnson Williams Brown Jones Garcia Miller Davis Wilson Anderson Thomas Moore Taylor Clark Lewis Walker)
  first="${firsts[$(( RANDOM % ${#firsts[@]} ))]}"
  last="${lasts[$(( RANDOM % ${#lasts[@]} ))]}"
  suffix=$(printf '%02d' $(( RANDOM % 100 )))
  echo "${first}${last}${suffix}"
}

# 12 字元密碼,保證含大小寫 + 數字 + 符號
gen_password() {
  local upper lower digit symbol rest
  upper=$(LC_ALL=C tr -dc 'A-Z' </dev/urandom | head -c1)
  lower=$(LC_ALL=C tr -dc 'a-z' </dev/urandom | head -c1)
  digit=$(LC_ALL=C tr -dc '0-9' </dev/urandom | head -c1)
  local syms='!@#$%&*+'
  symbol="${syms:$(( RANDOM % ${#syms} )):1}"
  rest=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c8)
  echo "${upper}${lower}${digit}${symbol}${rest}"
}

# ---------- 參數解析 ----------
URL="" EMAIL="" T_TOKEN="" MAILTM_PW="" NAME="" PASSWORD=""
while (( $# > 0 )); do
  case "$1" in
    --url)        URL="$2";        shift 2 ;;
    --email)      EMAIL="$2";      shift 2 ;;
    --t)          T_TOKEN="$2";    shift 2 ;;
    --mailtm-pw)  MAILTM_PW="$2";  shift 2 ;;
    --name)       NAME="$2";       shift 2 ;;
    --password)   PASSWORD="$2";   shift 2 ;;
    -h|--help)    sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//' >&2; exit 0 ;;
    *) die "未知參數: $1" ;;
  esac
done

if [[ -n "$URL" ]]; then
  EMAIL=$(url_param "$URL" 'email') || die "URL 解析不到 email"
  T_TOKEN=$(url_param "$URL" 't')    || die "URL 解析不到 t"
fi
[[ -n "$EMAIL"     ]] || die "缺 email(用 --url 或 --email)"
[[ -n "$T_TOKEN"   ]] || die "缺 t-token(用 --url 或 --t)"
[[ -n "$MAILTM_PW" ]] || die "缺 --mailtm-pw"

[[ -n "$NAME"     ]] || NAME=$(gen_name)
[[ -n "$PASSWORD" ]] || PASSWORD=$(gen_password)

echo "[signup] email    = $EMAIL"        >&2
echo "[signup] name     = $NAME"         >&2
echo "[signup] password = $PASSWORD"     >&2
echo "[signup] t-token  = ${T_TOKEN:0:30}..." >&2

# ---------- POST 註冊 ----------
BODY=$(node -e '
  const o = {
    name:     process.argv[1],
    email:    process.argv[2],
    password: process.argv[3],
    tac:      process.argv[4],
    h:        process.argv[5],
  };
  process.stdout.write(JSON.stringify(o));
' "$NAME" "$EMAIL" "$PASSWORD" "$TAC_DATE" "$T_TOKEN")

RESP=$(curl -sS -w '\n%{http_code}' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d "$BODY" "$ENDPOINT")
BODY_RESP=$(printf '%s' "$RESP" | sed '$d')
CODE=$(printf '%s' "$RESP" | tail -n1)

echo "[signup] HTTP $CODE" >&2
echo "[signup] body: $BODY_RESP" >&2

if [[ "$CODE" != "200" ]]; then
  die "註冊失敗 HTTP $CODE"
fi

# 解析回應確認成功
ERR=$(node -e '
  const j = JSON.parse(process.argv[1]);
  process.stdout.write(j.errorCode || "");
' "$BODY_RESP")
USER_ID=$(node -e '
  const j = JSON.parse(process.argv[1]);
  process.stdout.write(String(j.userId || ""));
' "$BODY_RESP")

if [[ "$ERR" != "Success" ]]; then
  die "回應錯誤: errorCode=$ERR  body=$BODY_RESP"
fi

echo "[signup] OK userId=$USER_ID" >&2

# ---------- 寫入台帳 ----------
bash "$ACCOUNTS_SH" add "$NAME" "$EMAIL" "$PASSWORD" "$MAILTM_PW" \
  "userId=$USER_ID camp=trial"

# ---------- stdout(機器可讀) ----------
echo "NAME=$NAME"
echo "EMAIL=$EMAIL"
echo "PASSWORD=$PASSWORD"
echo "USER_ID=$USER_ID"
