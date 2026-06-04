/**
 * chart-archive.mjs — 每日增量 K 線歸檔
 *
 * Usage:
 *   node chart-archive.mjs --symbol FX:XAUUSD                    # 增量更新
 *   node chart-archive.mjs --symbol FX:XAUUSD --init              # 初次匯入現有資料
 *   node chart-archive.mjs --symbol FX:XAUUSD --init --from 2026-02-01  # 指定起始日
 *   node chart-archive.mjs --symbol FX:XAUUSD --status            # 只看各 TF 狀態
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from './lib/args.mjs';
import { loadCookies } from './lib/cookies.mjs';
import { fetchRange, toUTC8, TF_LABELS, TF_SECONDS } from './lib/fetch-candles.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const opts = parseArgs({ symbol: 'FX:XAUUSD', from: '2026-02-01' });
const symbol = opts.symbol;
const symbolClean = symbol.replace(':', '').replace('/', '');

const ARCHIVE_DIR = path.resolve(__dirname, `../../data/archive/${symbolClean}`);
const EXAMPLES_DIR = path.resolve(__dirname, '../../docs/strategies/wg-concepts/examples');

const ALL_TFS = ['1W', '1D', '240', '60', '15', '5', '1'];

// --- helpers ---

function metaPath() { return path.join(ARCHIVE_DIR, 'meta.json'); }
function tfPath(tf) { return path.join(ARCHIVE_DIR, `${TF_LABELS[tf]}.json`); }

function readMeta() {
  const p = metaPath();
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
  return { symbol, lastUpdate: null, timeframes: {} };
}

function writeMeta(meta) {
  meta.lastUpdate = toUTC8(Math.floor(Date.now() / 1000));
  fs.writeFileSync(metaPath(), JSON.stringify(meta, null, 2));
}

function readTfData(tf) {
  const p = tfPath(tf);
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
  return { symbol, timeframe: TF_LABELS[tf], updatedAt: null, bars: [] };
}

function writeTfData(tf, data) {
  data.updatedAt = toUTC8(Math.floor(Date.now() / 1000));
  fs.writeFileSync(tfPath(tf), JSON.stringify(data, null, 2));
}

function mergeBars(existing, newBars) {
  const map = new Map();
  for (const b of existing) map.set(b.time_t, b);
  let added = 0;
  for (const b of newBars) {
    if (!map.has(b.time_t)) {
      map.set(b.time_t, b);
      added++;
    }
  }
  const sorted = [...map.values()].sort((a, b) => a.time_t - b.time_t);
  return { bars: sorted, added };
}

function batchDaysForTf(tf) {
  if (tf === '1' || tf === '5') return 7;
  if (tf === '15') return 30;
  return 90;
}

// --- status ---

function showStatus() {
  const meta = readMeta();
  console.log(`=== ${symbol} 歸檔狀態 ===\n`);
  console.log(`目錄: ${ARCHIVE_DIR}`);
  console.log(`最後更新: ${meta.lastUpdate || '尚未初始化'}\n`);
  console.log('TF     | 根數      | 最早               | 最晚               | 最後更新');
  console.log('-------|-----------|--------------------|--------------------|--------');

  for (const tf of ALL_TFS) {
    const label = TF_LABELS[tf].padEnd(5);
    const info = meta.timeframes[tf];
    if (!info) {
      console.log(`${label}  | -         | -                  | -                  | -`);
      continue;
    }
    const data = readTfData(tf);
    const first = data.bars[0];
    const last = data.bars[data.bars.length - 1];
    console.log(`${label}  | ${String(info.barCount).padStart(9)} | ${first?.time || '-'.padEnd(18)} | ${last?.time || '-'.padEnd(18)} | ${data.updatedAt || '-'}`);
  }
}

// --- init: 匯入現有 examples ---

async function init() {
  console.log(`=== 初次匯入: ${symbol} ===\n`);
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

  const prefix = `context-${symbolClean}`;
  const files = fs.readdirSync(EXAMPLES_DIR)
    .filter(f => f.startsWith(prefix) && f.endsWith('.json'));

  if (files.length === 0) {
    console.log(`在 ${EXAMPLES_DIR} 找不到 ${prefix}-*.json`);
    return;
  }

  console.log(`找到 ${files.length} 個現有資料檔:\n`);

  // 收集各 TF 的 bars
  const allByTf = {};
  for (const tf of ALL_TFS) allByTf[tf] = new Map();

  // TF 名稱映射（context JSON 用數字 key）
  const tfKeyMap = { '1W': '1W', '1D': '1D', '240': '240', '60': '60', '15': '15', '5': '5', '1': '1' };

  for (const file of files) {
    const filePath = path.join(EXAMPLES_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`  ${file}`);

    if (!data.candles) continue;

    for (const [key, bars] of Object.entries(data.candles)) {
      const tf = tfKeyMap[key];
      if (!tf || !allByTf[tf]) continue;
      const map = allByTf[tf];
      let added = 0;
      for (const b of bars) {
        if (b.time_t && !map.has(b.time_t)) {
          map.set(b.time_t, b);
          added++;
        }
      }
      if (added > 0) console.log(`    ${TF_LABELS[tf]}: +${added} 根`);
    }
  }

  // 寫各 TF 檔案
  console.log('\n寫入歸檔:');
  const meta = readMeta();

  for (const tf of ALL_TFS) {
    const map = allByTf[tf];
    if (map.size === 0) continue;

    const existingData = readTfData(tf);
    const { bars, added } = mergeBars(existingData.bars, [...map.values()]);
    existingData.bars = bars;
    writeTfData(tf, existingData);

    const lastBar = bars[bars.length - 1];
    meta.timeframes[tf] = { lastBarTime: lastBar.time_t, barCount: bars.length };
    console.log(`  ${TF_LABELS[tf]}: ${bars.length} 根 (${bars[0].time} ~ ${lastBar.time})`);
  }

  writeMeta(meta);
  console.log(`\n✅ 初次匯入完成`);
}

// --- incremental update ---

async function update() {
  console.log(`=== 增量更新: ${symbol} ===\n`);

  const meta = readMeta();

  const cookies = loadCookies({ silent: true });
  const session = cookies.find(c => c.name === 'sessionid')?.value;
  const signature = cookies.find(c => c.name === 'sessionid_sign')?.value || '';
  if (!session) {
    console.log('ERROR: sessionid cookie not found');
    process.exit(1);
  }

  const nowTs = Math.floor(Date.now() / 1000);
  let totalAdded = 0;

  for (const tf of ALL_TFS) {
    const label = TF_LABELS[tf];
    const info = meta.timeframes[tf];
    const fromTs = info?.lastBarTime
      ? info.lastBarTime + TF_SECONDS[tf]
      : new Date(opts.from + 'T00:00:00+08:00').getTime() / 1000;

    if (fromTs >= nowTs) {
      console.log(`${label}: 已是最新，跳過`);
      continue;
    }

    console.log(`\n${label}: 撈 ${toUTC8(fromTs)} ~ now`);

    const newBars = await fetchRange({
      session, signature, symbol, tf,
      fromTs, toTs: nowTs,
      batchDays: batchDaysForTf(tf),
    });

    if (newBars.length === 0) {
      console.log(`  無新資料`);
      continue;
    }

    const existingData = readTfData(tf);
    const { bars, added } = mergeBars(existingData.bars, newBars);
    existingData.bars = bars;
    writeTfData(tf, existingData);

    const lastBar = bars[bars.length - 1];
    meta.timeframes[tf] = { lastBarTime: lastBar.time_t, barCount: bars.length };
    totalAdded += added;
    console.log(`  ✅ +${added} 根（總共 ${bars.length} 根，最新 ${lastBar.time}）`);
  }

  writeMeta(meta);
  console.log(`\n✅ 增量更新完成，共新增 ${totalAdded} 根`);
}

// --- main ---

fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

if (opts.status !== undefined) {
  showStatus();
} else if (opts.init !== undefined) {
  await init();
  showStatus();
} else {
  await update();
}
