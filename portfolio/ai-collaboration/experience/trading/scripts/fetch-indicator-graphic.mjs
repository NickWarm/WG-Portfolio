/**
 * fetch-indicator-graphic.mjs — 取得 TradingView 指標畫的 graphic 物件
 *
 * 用 @mathieuc/tradingview 的 Study API：
 * - 列出使用者 private 指標
 * - 載入指定指標，取得 graphic.boxes / .labels / .lines
 * - 支援時間範圍過濾（UTC+8）
 * - 自動 bar_index → 時間映射
 *
 * Usage:
 *   node fetch-indicator-graphic.mjs --list
 *   node fetch-indicator-graphic.mjs --name "WG sop mtf" --tf 15
 *   node fetch-indicator-graphic.mjs --name "WG sop mtf" --tf 15 --from "2026-04-14 22:45" --to "2026-04-15 02:15"
 *   node fetch-indicator-graphic.mjs --name "WG sop mtf" --tf 15 --from "2026-04-14 22:45" --to "2026-04-15 02:15" --json
 *   node fetch-indicator-graphic.mjs --name "WG sop mtf" --tf 15 --type box          # 只看 box
 *   node fetch-indicator-graphic.mjs --name "WG sop mtf" --tf 15 --type label        # 只看 label
 *   node fetch-indicator-graphic.mjs --name "WG sop mtf" --tf 15 --text "亞當"       # 過濾 label/box 文字
 *
 * Options:
 *   --list                列出所有 private 指標
 *   --name <name>         指標名稱（模糊匹配，必填除 --list 外）
 *   --symbol <symbol>     商品（預設 FX:XAUUSD）
 *   --tf <timeframe>      時間週期（預設 15）
 *   --range <N>           載入 K 棒數量（預設 500）
 *   --from <datetime>     起始時間 UTC+8（格式：2026-04-14 22:45）
 *   --to <datetime>       結束時間 UTC+8（格式：2026-04-15 02:15）
 *   --type <box|label|line>  只輸出指定類型
 *   --text <keyword>      過濾含此文字的 label/box
 *   --json                輸出 JSON 格式（方便程式讀取）
 */
import TradingView from '@mathieuc/tradingview';
import { loadCookies } from './lib/cookies.mjs';
import { parseArgs } from './lib/args.mjs';

const TZ_OFFSET = 8;

function toUTC8(unixSec) {
  return new Date(unixSec * 1000 + TZ_OFFSET * 3600000)
    .toISOString().slice(0, 16).replace('T', ' ');
}

function parseUTC8(str) {
  // "2026-04-14 22:45" → unix seconds
  return new Date(str.replace(' ', 'T') + ':00+08:00').getTime() / 1000;
}

const opts = parseArgs({});

const cookies = loadCookies({ silent: true });
const session = cookies.find(c => c.name === 'sessionid')?.value;
const signature = cookies.find(c => c.name === 'sessionid_sign')?.value;

if (!session || !signature) {
  console.error('ERROR: 缺少 sessionid 或 sessionid_sign cookie');
  process.exit(1);
}

// ============= --list =============

if (opts.list) {
  const indicList = await TradingView.getPrivateIndicators(session);
  if (!indicList.length) { console.log('（無 private 指標）'); process.exit(0); }

  if (opts.json === 'true') {
    console.log(JSON.stringify(indicList.map(i => ({ name: i.name, id: i.id, version: i.version })), null, 2));
  } else {
    console.log('=== Private 指標清單 ===\n');
    indicList.forEach((indic, i) => {
      console.log(`[${i + 1}] ${indic.name}`);
      console.log(`    ID: ${indic.id}`);
      console.log(`    版本: ${indic.version || 'N/A'}\n`);
    });
  }
  process.exit(0);
}

// ============= 取得 graphic =============

if (!opts.name) {
  console.error('ERROR: 需要 --name <指標名稱>（或用 --list 查看清單）');
  process.exit(1);
}

const symbol = opts.symbol || 'FX:XAUUSD';
const tf = opts.tf || opts.timeframe || '15';
const range = parseInt(opts.range || '500');
const isJson = opts.json === 'true';
const typeFilter = opts.type || null;       // box | label | line
const textFilter = opts.text || null;
const fromTs = opts.from ? parseUTC8(opts.from) : null;
const toTs = opts.to ? parseUTC8(opts.to) : null;

if (!isJson) {
  console.log(`=== fetch-indicator-graphic ===`);
  console.log(`指標: ${opts.name}`);
  console.log(`商品: ${symbol}  時區: ${tf}  K棒數: ${range}`);
  if (fromTs) console.log(`範圍: ${opts.from} → ${opts.to || '最新'} (UTC+8)`);
  if (typeFilter) console.log(`類型: ${typeFilter}`);
  if (textFilter) console.log(`文字: "${textFilter}"`);
  console.log();
}

// 連線
const client = new TradingView.Client({ token: session, signature });
const chart = new client.Session.Chart();
chart.setMarket(symbol, { timeframe: tf, range });

// 找指標
const indicList = await TradingView.getPrivateIndicators(session);
const target = indicList.find(i => i.name.toLowerCase().includes(opts.name.toLowerCase()));

if (!target) {
  console.error(`ERROR: 找不到包含「${opts.name}」的指標`);
  console.error('可用指標:', indicList.map(i => i.name).join(', '));
  client.end();
  process.exit(1);
}

if (!isJson) console.log(`載入「${target.name}」(${target.id})...\n`);

const privateIndic = await target.get();
const study = new chart.Study(privateIndic);

// 等 chart + study 都 ready
let chartPeriods = null;
let studyGraphic = null;

function tryOutput() {
  if (!chartPeriods || !studyGraphic) return;

  // bar_index → time 映射
  const barTime = (idx) => {
    const p = chartPeriods[idx];
    return p ? p.time : null;
  };

  const inRange = (barIdx) => {
    const t = barTime(barIdx);
    if (!t) return !fromTs; // 沒有映射時，如果沒設 from 就全部顯示
    if (fromTs && t < fromTs) return false;
    if (toTs && t > toTs) return false;
    return true;
  };

  const matchText = (text) => {
    if (!textFilter) return true;
    return text && text.includes(textFilter);
  };

  const g = studyGraphic;

  // 處理 boxes
  let boxes = (g.boxes || []).map(b => ({
    type: 'box',
    top: b.y1,
    bottom: b.y2,
    leftBar: b.x1,
    rightBar: b.x2,
    leftTime: barTime(b.x1) ? toUTC8(barTime(b.x1)) : null,
    rightTime: barTime(b.x2) ? toUTC8(barTime(b.x2)) : null,
    style: b.style,
    color: b.color,
    bgColor: b.bgColor,
    text: b.text || '',
  }));

  // 處理 labels
  let labels = (g.labels || []).map(l => ({
    type: 'label',
    text: l.text,
    toolTip: l.toolTip || '',
    x: l.x,
    y: l.y,
    time: barTime(l.x) ? toUTC8(barTime(l.x)) : null,
    style: l.style,
    color: l.color,
    textColor: l.textColor,
    size: l.size,
  }));

  // 處理 lines
  let lines = (g.lines || []).map(l => ({
    type: 'line',
    y1: l.y1,
    y2: l.y2,
    x1Bar: l.x1,
    x2Bar: l.x2,
    x1Time: barTime(l.x1) ? toUTC8(barTime(l.x1)) : null,
    x2Time: barTime(l.x2) ? toUTC8(barTime(l.x2)) : null,
    style: l.style,
    color: l.color,
    width: l.width,
    extend: l.extend,
  }));

  // 時間過濾
  if (fromTs || toTs) {
    boxes = boxes.filter(b => {
      const lt = barTime(b.leftBar), rt = barTime(b.rightBar);
      return (lt && inRange(b.leftBar)) || (rt && inRange(b.rightBar));
    });
    labels = labels.filter(l => inRange(l.x));
    lines = lines.filter(l => inRange(l.x1Bar) || inRange(l.x2Bar));
  }

  // 文字過濾（label 同時檢查 text 和 toolTip）
  if (textFilter) {
    boxes = boxes.filter(b => matchText(b.text));
    labels = labels.filter(l => matchText(l.text) || matchText(l.toolTip));
    // lines 沒有 text，如果有 textFilter 就跳過 lines
  }

  // 類型過濾
  const showBox = !typeFilter || typeFilter === 'box';
  const showLabel = !typeFilter || typeFilter === 'label';
  const showLine = !typeFilter || typeFilter === 'line';

  // JSON 輸出
  if (isJson) {
    const result = {
      indicator: target.name,
      symbol,
      timeframe: tf,
      from: opts.from || null,
      to: opts.to || null,
    };
    if (showBox) result.boxes = boxes;
    if (showLabel) result.labels = labels;
    if (showLine) result.lines = lines;
    console.log(JSON.stringify(result, null, 2));
    client.end();
    return;
  }

  // 人類可讀輸出
  const totalFiltered = (showBox ? boxes.length : 0) + (showLabel ? labels.length : 0) + (showLine ? lines.length : 0);
  console.log(`共 ${totalFiltered} 個繪圖物件`);
  if (fromTs) console.log(`（已過濾 ${opts.from} → ${opts.to || '最新'}）`);
  console.log();

  if (showBox && boxes.length) {
    console.log(`--- Boxes (${boxes.length}) ---`);
    boxes.forEach((b, i) => {
      const txt = b.text ? ` text="${b.text}"` : '';
      console.log(`  [${i}] top=${b.top}  bottom=${b.bottom}  ${b.leftTime} → ${b.rightTime}  style=${b.style}${txt}`);
    });
    console.log();
  }

  if (showLabel && labels.length) {
    console.log(`--- Labels (${labels.length}) ---`);
    labels.forEach((l, i) => {
      const tip = l.toolTip ? `  tag=${l.toolTip}` : '';
      console.log(`  [${i}] "${l.text}"  y=${l.y}  ${l.time}  style=${l.style}${tip}`);
    });
    console.log();
  }

  if (showLine && lines.length) {
    console.log(`--- Lines (${lines.length}) ---`);
    lines.forEach((l, i) => {
      const horizontal = l.y1 === l.y2;
      if (horizontal) {
        console.log(`  [${i}] y=${l.y1}  ${l.x1Time} → ${l.x2Time}  style=${l.style}${l.extend !== 'none' ? ' extend=' + l.extend : ''}`);
      } else {
        console.log(`  [${i}] y1=${l.y1} → y2=${l.y2}  ${l.x1Time}  style=${l.style}${l.extend !== 'none' ? ' extend=' + l.extend : ''}`);
      }
    });
    console.log();
  }

  client.end();
}

chart.onUpdate(() => {
  if (chartPeriods) return;
  chartPeriods = chart.periods;
  if (!isJson) console.log(`chart: ${chartPeriods.length} bars (${toUTC8(chartPeriods[chartPeriods.length - 1].time)} → ${toUTC8(chartPeriods[0].time)})\n`);
  tryOutput();
});

study.onError((...err) => {
  console.error('ERROR:', err.join(' '));
  client.end();
  process.exit(1);
});

let gotUpdate = false;
study.onUpdate(() => {
  if (gotUpdate) return;
  gotUpdate = true;
  studyGraphic = study.graphic;
  tryOutput();
});
