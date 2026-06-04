#!/usr/bin/env bash
# mailtm.sh — mail.tm 拋棄式信箱單一工具
#
# 用法:
#   bash mailtm.sh create
#       → stdout 印出 KEY=VALUE 三行:EMAIL / PASSWORD / TOKEN
#
#   bash mailtm.sh login <email> <password>
#       → stdout 印出 TOKEN=<jwt>(用於後續 wait)
#
#   bash mailtm.sh wait --token <jwt> [--match <regex>] [--timeout <sec=300>] [--interval <sec=5>]
#       → 輪詢收件匣,有新信時:
#         無 --match:印寄件人/主旨/內文/HTML 全部連結;exit 0
#         有 --match:從信件 HTML/text 抓出第一條符合 regex 的 URL,印 LINK=<url>;exit 0
#       → 超時 exit 2
#
# 依賴: bash, curl, node(僅用於 JSON 解析,無需任何 npm 套件)
set -euo pipefail

API="https://api.mail.tm"

# ---------- helpers ---------------------------------------------------------
jget() {  # $1=json $2=dot.path (例如 "0.domain" "token")
  node -e '
    const j = JSON.parse(process.argv[1]);
    const v = process.argv[2].split(".").reduce((a,k) => a?.[k], j);
    if (v === undefined || v === null) process.exit(2);
    process.stdout.write(String(v));
  ' "$1" "$2"
}

die() { echo "[ERROR] $*" >&2; exit 1; }

# ---------- subcommand: create ---------------------------------------------
cmd_create() {
  local domains_json domain rand email password create_resp create_body create_code token_json token me_json me_addr

  domains_json=$(curl -sS -H 'Accept: application/json' "$API/domains")
  domain=$(jget "$domains_json" '0.domain') || die "取得網域失敗"
  echo "[create] 網域: $domain" >&2

  rand=$(LC_ALL=C tr -dc 'a-z0-9' </dev/urandom | head -c 12 || true)
  email="user${rand}@${domain}"
  password=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 16 || true)
  echo "[create] 帳號: $email" >&2

  create_resp=$(curl -sS -w '\n%{http_code}' \
    -H 'Content-Type: application/json' -H 'Accept: application/json' \
    -d "{\"address\":\"$email\",\"password\":\"$password\"}" \
    "$API/accounts")
  create_body=$(printf '%s' "$create_resp" | sed '$d')
  create_code=$(printf '%s' "$create_resp" | tail -n1)
  [[ "$create_code" == "201" ]] || { echo "$create_body" >&2; die "建立帳號失敗 HTTP $create_code"; }

  token_json=$(curl -sS -H 'Content-Type: application/json' -H 'Accept: application/json' \
    -d "{\"address\":\"$email\",\"password\":\"$password\"}" \
    "$API/token")
  token=$(jget "$token_json" 'token') || { echo "$token_json" >&2; die "取 token 失敗"; }

  me_json=$(curl -sS -H "Authorization: Bearer $token" "$API/me")
  me_addr=$(jget "$me_json" 'address') || die "/me 解析失敗"
  [[ "$me_addr" == "$email" ]] || die "/me 驗證 mismatch: $me_addr != $email"
  echo "[create] OK 信箱可登入" >&2

  echo "EMAIL=$email"
  echo "PASSWORD=$password"
  echo "TOKEN=$token"
}

# ---------- subcommand: wait -----------------------------------------------
cmd_wait() {
  local token="" match="" timeout=300 interval=5
  while (( $# > 0 )); do
    case "$1" in
      --token)    token="$2";    shift 2 ;;
      --match)    match="$2";    shift 2 ;;
      --timeout)  timeout="$2";  shift 2 ;;
      --interval) interval="$2"; shift 2 ;;
      *) die "未知參數: $1" ;;
    esac
  done
  [[ -n "$token" ]] || die "--token 必填"

  local auth="Authorization: Bearer $token"
  local start now elapsed list result id from subject full
  start=$(date +%s)

  echo "[wait] 輪詢 ${interval}s,最多 ${timeout}s${match:+,過濾 regex='$match'}" >&2

  while :; do
    now=$(date +%s); elapsed=$(( now - start ))
    if (( elapsed >= timeout )); then
      echo "" >&2
      echo "[wait] 超時 ${timeout}s,未收到新信" >&2
      exit 2
    fi

    list=$(curl -sS -H "$auth" -H 'Accept: application/json' "$API/messages")
    result=$(node -e '
      let raw=""; process.stdin.on("data",c=>raw+=c);
      process.stdin.on("end",()=>{
        const d=JSON.parse(raw);
        const arr=Array.isArray(d)?d:(d["hydra:member"]||[]);
        if(arr.length===0){console.log("EMPTY");return;}
        const m=arr[0];
        console.log("ID="+m.id);
        console.log("FROM="+((m.from&&m.from.address)||""));
        console.log("SUBJECT="+(m.subject||""));
      });
    ' <<<"$list")

    if [[ "$result" == "EMPTY" ]]; then
      printf "\r[wait] 已等 %ds,信箱仍空..." "$elapsed" >&2
      sleep "$interval"; continue
    fi

    id=$(echo "$result"      | sed -n 's/^ID=//p')
    from=$(echo "$result"    | sed -n 's/^FROM=//p')
    subject=$(echo "$result" | sed -n 's/^SUBJECT=//p')

    echo "" >&2
    echo "[wait] 收到信 — From: $from / Subject: $subject" >&2
    full=$(curl -sS -H "$auth" -H 'Accept: application/json' "$API/messages/$id")

    if [[ -n "$match" ]]; then
      # 只輸出第一條符合 regex 的連結
      node -e '
        let raw=""; process.stdin.on("data",c=>raw+=c);
        process.stdin.on("end",()=>{
          const m=JSON.parse(raw);
          const html=Array.isArray(m.html)?m.html.join("\n"):(m.html||"");
          const text=m.text||"";
          const re=new RegExp(process.argv[1]);
          const urls=[];
          for(const x of html.matchAll(/href=["\x27]([^"\x27]+)["\x27]/gi)) urls.push(x[1]);
          for(const x of text.matchAll(/https?:\/\/\S+/gi)) urls.push(x[0]);
          const hit=urls.find(u=>re.test(u));
          if(!hit){console.error("[wait] 信件收到但找不到符合 regex 的連結"); process.exit(3);}
          console.log("LINK="+hit);
        });
      ' "$match" <<<"$full"
    else
      echo "FROM=$from"
      echo "SUBJECT=$subject"
      echo "--- text ---"
      node -e '
        let raw=""; process.stdin.on("data",c=>raw+=c);
        process.stdin.on("end",()=>{
          const m=JSON.parse(raw);
          console.log(m.text||"(no text)");
          console.log("--- links ---");
          const html=Array.isArray(m.html)?m.html.join("\n"):(m.html||"");
          for(const x of html.matchAll(/href=["\x27]([^"\x27]+)["\x27]/gi)) console.log(x[1]);
        });
      ' <<<"$full"
    fi
    exit 0
  done
}

# ---------- dispatch --------------------------------------------------------
sub="${1:-}"; shift || true
cmd_login() {
  local email="${1:-}" password="${2:-}"
  [[ -n "$email" && -n "$password" ]] || die "用法: login <email> <password>"
  local token_json token
  token_json=$(curl -sS -H 'Content-Type: application/json' -H 'Accept: application/json' \
    -d "{\"address\":\"$email\",\"password\":\"$password\"}" \
    "$API/token")
  token=$(jget "$token_json" 'token') || { echo "$token_json" >&2; die "login 失敗"; }
  echo "TOKEN=$token"
}

case "$sub" in
  create) cmd_create "$@" ;;
  login)  cmd_login  "$@" ;;
  wait)   cmd_wait   "$@" ;;
  *) cat >&2 <<EOF
用法:
  bash mailtm.sh create
  bash mailtm.sh login <email> <password>
  bash mailtm.sh wait --token <jwt> [--match <regex>] [--timeout 300] [--interval 5]
EOF
    exit 1 ;;
esac
