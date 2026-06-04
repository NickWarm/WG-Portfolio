#!/usr/bin/env node
// sniff capture.mjs — 開獨立 Chrome、錄 network 事件、Ctrl+C 寫 JSON。
// 設計與決策見 tech-notes/web-reverse-engineering-toolkit.md。
//
// 用法：
//   node capture.mjs <url> [--filter xhr,fetch] [--out file.json]
//                          [--profile <key>] [--body]
//
// --profile <key>:
//   不給        → 暫存 user-data-dir（用完丟）
//   <key>       → ~/.claude/browser-profiles/chrome-<key>/  （持久化，與 /dlv 同慣例）
// --filter:    逗號分隔 resourceType（document/xhr/fetch/script/...）
// --body:      連 response body 一起抓（注意：可能很大）

import puppeteer from 'puppeteer-core';
import {mkdtempSync, writeFileSync, mkdirSync, existsSync, readFileSync} from 'node:fs';
import {tmpdir, homedir, platform} from 'node:os';
import {join} from 'node:path';

// Chrome 路徑：config → env → OS 預設。詳見 tech-notes/web-reverse-engineering-toolkit.md
function resolveChromePath() {
  const cfg = join(homedir(), 'claude_work', 'config.json');
  if (existsSync(cfg)) {
    try {
      const p = JSON.parse(readFileSync(cfg, 'utf8'))?.chrome?.path;
      if (p) return p;
    } catch {}
  }
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const os = platform();
  if (os === 'win32')  return 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  if (os === 'darwin') return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  return '/usr/bin/google-chrome';
}
const CHROME_EXE = resolveChromePath();

// --- argv ---
const args = process.argv.slice(2);
if (args.length === 0 || args[0].startsWith('--')) {
  console.error('usage: node capture.mjs <url> [--filter xhr,fetch] [--out file] [--profile <key>] [--body]');
  process.exit(64);
}
const url = args[0];
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (name) => args.includes(name);

const filterRaw = flag('--filter');
const filterSet = filterRaw ? new Set(filterRaw.split(',').map(s => s.trim())) : null;
const outPath = flag('--out') || `sniff-${Date.now()}.json`;
const profileKey = flag('--profile');
const wantBody = has('--body');
const noRedact = has('--no-redact');

// 敏感欄位自動遮蔽（預設開啟）。涵蓋常見命名；可用 --no-redact 關閉。
// 設計理由見 tech-notes/web-reverse-engineering-toolkit.md
// 兩段：強敏感字（任意位置 substring，含 camelCase）+ 邊界字（前後須為邊界，避免誤殺如 "user" / "auth" 在 "authority"）
const SENSITIVE_SUBSTR = /(password|passwd|pwd|secret|token|apikey|api_key|otp|cvv|ssn|creditcard|credit_card)/i;
const SENSITIVE_BOUNDED = /(?:^|[._-])(auth|authorization|session|pin)(?:$|[._-])/i;
const SENSITIVE_KEY = (k) => SENSITIVE_SUBSTR.test(k) || SENSITIVE_BOUNDED.test(k);
function redactValue(v) {
  if (v == null) return v;
  if (Array.isArray(v)) return v.map(redactValue);
  if (typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      out[k] = SENSITIVE_KEY(k) ? '[REDACTED]' : redactValue(val);
    }
    return out;
  }
  return v;
}
// 敏感 headers（預設遮）。可用 --no-redact 一併關閉
const SENSITIVE_HEADER = /^(cookie|set-cookie|authorization|proxy-authorization|x-api-key|x-auth-token|x-access-token)$/i;
function redactHeaders(h) {
  if (noRedact || !h) return h;
  const out = {};
  for (const [k, v] of Object.entries(h)) out[k] = SENSITIVE_HEADER.test(k) ? '[REDACTED]' : v;
  return out;
}
function redactBody(body, contentType = '') {
  if (noRedact || !body || typeof body !== 'string') return body;
  // JSON
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('json') || /^\s*[\{\[]/.test(body)) {
    try { return JSON.stringify(redactValue(JSON.parse(body))); } catch {}
  }
  // form-urlencoded
  if (ct.includes('form-urlencoded') || /^[^=&\s]+=[^=&]*(&[^=&\s]+=[^=&]*)*$/.test(body)) {
    try {
      const p = new URLSearchParams(body);
      for (const k of [...p.keys()]) if (SENSITIVE_KEY(k)) p.set(k, '[REDACTED]');
      return p.toString();
    } catch {}
  }
  return body;
}

// --- user-data-dir：暫存 vs 持久（沿用 /dlv cookie-refresh.sh 慣例）---
let userDataDir;
if (profileKey) {
  userDataDir = join(homedir(), '.claude', 'browser-profiles', `chrome-${profileKey}`);
  if (!existsSync(userDataDir)) mkdirSync(userDataDir, {recursive: true});
  console.error(`[sniff] using persistent profile: ${userDataDir}`);
} else {
  userDataDir = mkdtempSync(join(tmpdir(), 'sniff-'));
  console.error(`[sniff] using temp profile: ${userDataDir}`);
}

// --- launch ---
const browser = await puppeteer.launch({
  executablePath: CHROME_EXE,
  headless: false,
  defaultViewport: null,
  userDataDir,
  args: ['--no-first-run', '--no-default-browser-check'],
});

const pages = await browser.pages();
const page = pages[0] ?? await browser.newPage();

const records = [];
const seen = new Map();   // requestId → start time (對 response 配對用)
let idSeq = 0;

const accept = (req) => !filterSet || filterSet.has(req.resourceType());

page.on('request', (req) => {
  if (!accept(req)) return;
  const id = ++idSeq;
  seen.set(req, id);
  records.push({
    id,
    phase: 'request',
    t: Date.now(),
    method: req.method(),
    url: req.url(),
    resourceType: req.resourceType(),
    headers: redactHeaders(req.headers()),
    postData: redactBody(req.postData() ?? null, req.headers()['content-type']),
  });
});

page.on('response', async (res) => {
  const req = res.request();
  const id = seen.get(req);
  if (id === undefined) return; // 被 filter 擋掉的 request 不收 response
  const rec = {
    id,
    phase: 'response',
    t: Date.now(),
    url: req.url(),
    status: res.status(),
    headers: redactHeaders(res.headers()),
  };
  if (wantBody) {
    try { rec.body = redactBody(await res.text(), res.headers()['content-type']); }
    catch (e) { rec.bodyError = String(e); }
  }
  records.push(rec);
});

page.on('requestfailed', (req) => {
  const id = seen.get(req);
  if (id === undefined && !accept(req)) return;
  records.push({
    id: id ?? ++idSeq,
    phase: 'failed',
    t: Date.now(),
    url: req.url(),
    errorText: req.failure()?.errorText ?? 'unknown',
  });
});

// --- 啟動 + 提示 ---
try {
  await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 60000});
} catch (e) {
  console.error(`[sniff] goto warning: ${e.message}`); // 不致命，使用者可能還想操作
}
console.error('\n[sniff] 錄製中。操作網頁，完成後在此 terminal 按 Ctrl+C 結束\n');

// --- 收尾：SIGINT / 關視窗 / 進程強制退出都能保住 JSON ---
const writeOut = () => writeFileSync(outPath, JSON.stringify({
  url, filter: filterRaw ?? null, capturedAt: new Date().toISOString(),
  count: records.length, records,
}, null, 2));
let finishing = false;
const finish = async () => {
  if (finishing) return;
  finishing = true;
  writeOut();
  console.error(`\n[sniff] wrote ${records.length} records → ${outPath}`);
  try { await browser.close(); } catch {}
  process.exit(0);
};
process.on('SIGINT', finish);
process.on('SIGTERM', finish);
process.on('exit', () => { if (!finishing) writeOut(); }); // 強砍時的兜底（sync only）
browser.on('disconnected', finish);
