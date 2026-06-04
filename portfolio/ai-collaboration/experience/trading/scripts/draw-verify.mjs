/**
 * draw-verify.mjs — 繪圖數據驗證 script
 *
 * 從 TradingView 拉繪圖報價 + OHLCV K 線，讓使用者目視比對畫面。
 * 不需要開瀏覽器，全終端完成。
 *
 * Usage:
 *   node draw-verify.mjs XAUUSD                          # 搜尋券商，互動選擇
 *   node draw-verify.mjs --symbol OANDA:XAUUSD            # 直接指定，跳過搜尋
 *   node draw-verify.mjs XAUUSD --timeframe 60 --bars 10  # 1H K 線，10 根
 *   node draw-verify.mjs --symbol OANDA:XAUUSD --from 2026-04-01 --to 2026-04-07
 */
import TradingView from '@mathieuc/tradingview';
import { loadCookies } from './lib/cookies.mjs';
import { parseArgs } from './lib/args.mjs';
import * as readline from 'readline';

const TZ_OFFSET = 8; // UTC+8（台灣），與 TradingView 圖表時區一致

// --- 工具函數 ---

function toUTC8(unixSec) {
  return new Date(unixSec * 1000 + TZ_OFFSET * 3600000)
    .toISOString().slice(0, 16).replace('T', ' ');
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

// --- 解析參數 ---

const opts = parseArgs({ layout: 'Se13DYOL', timeframe: '15', bars: '5' });
const keyword = process.argv.find(a => !a.startsWith('--') && !a.startsWith('/') && a !== process.argv[0] && a !== process.argv[1]);

if (!keyword && !opts.symbol) {
  console.log('Usage: node draw-verify.mjs <keyword> [--symbol BROKER:SYMBOL] [--timeframe 15] [--bars 5] [--from DATE] [--to DATE]');
  process.exit(1);
}

console.log('=== draw-verify ===\n');

// --- 1. 取得券商代號 ---

let symbol = opts.symbol;

if (!symbol) {
  console.log(`1. 搜尋 "${keyword}"...`);
  const results = await TradingView.searchMarketV3(keyword);

  if (results.length === 0) {
    console.log('   找不到符合的商品');
    process.exit(1);
  }

  const show = results.slice(0, 10);
  for (let i = 0; i < show.length; i++) {
    console.log(`   [${i + 1}] ${show[i].id} — ${show[i].description} (${show[i].type})`);
  }

  const choice = await ask('\n   選擇編號: ');
  const idx = parseInt(choice) - 1;
  if (idx < 0 || idx >= show.length) {
    console.log('   無效選擇');
    process.exit(1);
  }
  symbol = show[idx].id;
} else {
  console.log(`1. 使用指定商品: ${symbol}`);
}

console.log(`\n   ✅ ${symbol}\n`);

// --- 2. 認證 ---

console.log('2. 取得 cookie...');
const cookies = loadCookies({ silent: true });
const session = cookies.find(c => c.name === 'sessionid')?.value;
const signature = cookies.find(c => c.name === 'sessionid_sign')?.value || '';

if (!session) {
  console.log('   ERROR: sessionid cookie not found');
  process.exit(1);
}
console.log('   ✅ sessionid ok\n');

// --- 3. 拉繪圖 ---

console.log('3. 拉繪圖數據...');
try {
  const url = `https://charts-storage.tradingview.com/charts-storage/layout/${opts.layout}/sources?chart_id=1&jwt=${session}`;
  const resp = await fetch(url, {
    headers: {
      'Cookie': `sessionid=${session}; sessionid_sign=${signature}`,
      'Origin': 'https://www.tradingview.com',
      'Referer': 'https://www.tradingview.com/',
    },
  });

  if (!resp.ok) {
    console.log(`   ERROR: HTTP ${resp.status}`);
  } else {
    const data = await resp.json();
    const sources = Object.values(data.payload?.sources || {});

    // 篩選該 symbol，且只取畫面上顯示的繪圖（visible !== false）
    // API 回傳 state.state.visible 標記繪圖是否隱藏：
    //   visible: true  → 畫面上看得到
    //   visible: false → 使用者隱藏了
    // 使用者會用隱藏/顯示來控制哪些繪圖要被讀取（WG-SOP 開發時常用操作）
    const bySymbol = sources.filter(d => d.symbol === symbol);
    const visible = bySymbol.filter(d => d.state?.state?.visible !== false);

    // 時間範圍過濾：如果有 --from / --to，只保留 points.time_t 落在範圍內的繪圖
    // 判斷方式：繪圖的任一 point 落在範圍內就保留
    let filtered = visible;
    let timeFilterMsg = '';
    if (opts.from || opts.to) {
      const fromTs = opts.from ? new Date(opts.from + 'T00:00:00+08:00').getTime() / 1000 : 0;
      const toTs = opts.to ? new Date(opts.to + 'T23:59:59+08:00').getTime() / 1000 : Infinity;
      filtered = visible.filter(d => {
        const pts = d.state?.points || [];
        return pts.some(p => p.time_t >= fromTs && p.time_t <= toTs);
      });
      const timeFilteredCount = visible.length - filtered.length;
      timeFilterMsg = `，時間範圍外 ${timeFilteredCount}`;
    }

    const hiddenCount = bySymbol.length - visible.length;
    console.log(`   全部 ${sources.length} 個繪圖，${symbol} 有 ${bySymbol.length} 個（顯示 ${filtered.length}，隱藏 ${hiddenCount}${timeFilterMsg}）\n`);

    if (filtered.length > 0) {
      console.log(`--- ${symbol} 繪圖報價 (UTC+8) ---`);
      const sorted = filtered.sort((a, b) => (b.serverUpdateTime || 0) - (a.serverUpdateTime || 0));
      for (const d of sorted) {
        const type = (d.state?.type || '?').replace('LineTool', '');
        const pts = d.state?.points || [];
        const prices = pts.map(p => p.price?.toFixed(2)).join(' → ');
        const times = pts.map(p => p.time_t ? toUTC8(p.time_t) : '?').join(' → ');
        const text = d.state?.state?.text || '';
        const bgColor = d.state?.state?.backgroundColor || d.state?.state?.color || '';
        const borderColor = d.state?.state?.borderColor || '';
        const colorInfo = bgColor ? ` (bg:${bgColor}${borderColor ? ' border:' + borderColor : ''})` : '';
        console.log(`  [${type}] ${prices}${text ? ` "${text}"` : ''}${colorInfo}`);
        console.log(`           ${times}`);
      }
    } else {
      console.log(`   ⚠️  ${symbol} 沒有繪圖。請確認：`);
      console.log(`      - 你是否在這個 symbol 上畫了圖？`);
      console.log(`      - layout ID 是否正確？（目前: ${opts.layout}）`);

      // 列出有繪圖的 symbol 供參考
      const symbolCounts = {};
      for (const d of sources) {
        const s = d.symbol || '(unknown)';
        symbolCounts[s] = (symbolCounts[s] || 0) + 1;
      }
      console.log(`\n   目前有繪圖的商品：`);
      for (const [s, c] of Object.entries(symbolCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
        console.log(`      ${s}: ${c} 個`);
      }
    }
  }
} catch (err) {
  console.log(`   ERROR: ${err.message}`);
}

// --- 4. 拉 OHLCV ---

const timeframe = opts.timeframe;
const bars = parseInt(opts.bars);
const tfLabel = { '5': '5m', '15': '15m', '60': '1H', '240': '4H', '1D': '1D' }[timeframe] || timeframe;

console.log(`\n4. 拉 OHLCV（${tfLabel}，${bars} 根）...`);

try {
  await new Promise((resolve, reject) => {
    const clientOpts = { token: session, signature };
    const client = new TradingView.Client(clientOpts);
    const chart = new client.Session.Chart();

    const marketOpts = { timeframe, range: bars };

    // 支援 --from/--to 日期範圍
    if (opts.to) {
      const toDate = new Date(opts.to + 'T23:59:59+08:00');
      marketOpts.to = Math.floor(toDate.getTime() / 1000);
    }
    if (opts.from && opts.to) {
      // 計算日期範圍內大約多少根 K 線
      const fromDate = new Date(opts.from + 'T00:00:00+08:00');
      const toDate = new Date(opts.to + 'T23:59:59+08:00');
      const diffSec = (toDate - fromDate) / 1000;
      const tfSec = { '5': 300, '15': 900, '60': 3600, '240': 14400, '1D': 86400 }[timeframe] || 900;
      marketOpts.range = Math.ceil(diffSec / tfSec);
      marketOpts.to = Math.floor(toDate.getTime() / 1000);
    }

    chart.setMarket(symbol, marketOpts);

    chart.onError((...err) => {
      console.log('   Chart error:', ...err);
      client.end();
      reject(new Error('Chart error'));
    });

    let handled = false;
    chart.onUpdate(() => {
      if (handled) return;
      if (!chart.periods || chart.periods.length === 0) return;
      handled = true;

      console.log(`   ✅ ${chart.periods.length} 根 K 線\n`);
      console.log(`--- ${symbol} OHLCV ${tfLabel} (UTC+8) ---`);
      console.log('  時間              Open      High      Low       Close     Volume');

      for (const p of chart.periods) {
        const time = toUTC8(p.time);
        const o = p.open?.toFixed(2)?.padStart(9) || '?';
        const h = p.max?.toFixed(2)?.padStart(9) || '?';
        const l = p.min?.toFixed(2)?.padStart(9) || '?';
        const c = p.close?.toFixed(2)?.padStart(9) || '?';
        const v = p.volume?.toFixed(0)?.padStart(9) || '?';
        console.log(`  ${time}  ${o}  ${h}  ${l}  ${c}  ${v}`);
      }

      client.end();
      resolve();
    });

    setTimeout(() => {
      if (!handled) {
        console.log('   TIMEOUT: 15 秒無回應');
        client.end();
        resolve();
      }
    }, 15000);
  });
} catch (err) {
  console.log(`   ERROR: ${err.message}`);
}

console.log('\n→ 請對照 TradingView 畫面，確認以上數據一致。');
