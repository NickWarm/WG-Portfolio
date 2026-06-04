/**
 * sim-sr-refactor.mjs
 *
 * 驗證 S/R 線 refactor 提案：UDT + array + 迴圈 vs 散落變數 + 硬編碼
 * 確認重構後結果跟重構前完全一致
 *
 * Usage:
 *   node debug/sim-sr-refactor.mjs
 */

console.log('=== S/R 線 Refactor 本地驗證 ===\n');

// ============= 模擬 pivot 值（用假資料測試邏輯）=============

// 6 個時區的 h1/h2/l1/l2（假設已從 request.security 取得）
const tfData = {
  '1W':  { h1: 4800, h2: 4850, l1: 4500, l2: 4450, enabled: false, showPrev: false },
  '1D':  { h1: 4780, h2: 4820, l1: 4550, l2: 4520, enabled: false, showPrev: false },
  '4H':  { h1: 4780, h2: 4800, l1: 4600, l2: 4620, enabled: false, showPrev: false },  // h1=1D h1 很接近
  '1H':  { h1: 4710, h2: 4740, l1: 4650, l2: 4630, enabled: true,  showPrev: false },
  '15m': { h1: 4712, h2: 4720, l1: 4648, l2: 4660, enabled: true,  showPrev: false },  // h1=1H h1 接近
  '5m':  { h1: 4713, h2: 4716, l1: 4649, l2: 4652, enabled: false, showPrev: false },
};
const tol = 5.0;

// ============= 方法 A：散落變數 + 硬編碼（原版）=============

function originalLogic(d, tol) {
  // isNearAny（舊 8 參數版本）
  const isNearAny = (price, v1, v2, v3, v4, v5, v6, v7, v8) => {
    let r = false;
    [v1,v2,v3,v4,v5,v6,v7,v8].forEach(v => {
      if (v != null && Math.abs(price - v) <= tol) r = true;
    });
    return r;
  };

  const n = null;
  // 15m：跟 1H/4H/1D/1W 比
  const pv15m_h1_draw = isNearAny(d['15m'].h1, d['1H'].h1, d['1H'].l1, d['4H'].h1, d['4H'].l1, d['1D'].h1, d['1D'].l1, d['1W'].h1, d['1W'].l1) ? n : d['15m'].h1;
  const pv15m_l1_draw = isNearAny(d['15m'].l1, d['1H'].h1, d['1H'].l1, d['4H'].h1, d['4H'].l1, d['1D'].h1, d['1D'].l1, d['1W'].h1, d['1W'].l1) ? n : d['15m'].l1;
  // 1H：跟 4H/1D/1W 比
  const pv1H_h1_draw = isNearAny(d['1H'].h1, d['4H'].h1, d['4H'].l1, d['1D'].h1, d['1D'].l1, d['1W'].h1, d['1W'].l1, n, n) ? n : d['1H'].h1;
  const pv1H_l1_draw = isNearAny(d['1H'].l1, d['4H'].h1, d['4H'].l1, d['1D'].h1, d['1D'].l1, d['1W'].h1, d['1W'].l1, n, n) ? n : d['1H'].l1;
  // 4H：跟 1D/1W 比
  const pv4H_h1_draw = isNearAny(d['4H'].h1, d['1D'].h1, d['1D'].l1, d['1W'].h1, d['1W'].l1, n, n, n, n) ? n : d['4H'].h1;
  const pv4H_l1_draw = isNearAny(d['4H'].l1, d['1D'].h1, d['1D'].l1, d['1W'].h1, d['1W'].l1, n, n, n, n) ? n : d['4H'].l1;
  // 1D：跟 1W 比
  const pvD_h1_draw = isNearAny(d['1D'].h1, d['1W'].h1, d['1W'].l1, n, n, n, n, n, n) ? n : d['1D'].h1;
  const pvD_l1_draw = isNearAny(d['1D'].l1, d['1W'].h1, d['1W'].l1, n, n, n, n, n, n) ? n : d['1D'].l1;

  return { pv15m_h1_draw, pv15m_l1_draw, pv1H_h1_draw, pv1H_l1_draw, pv4H_h1_draw, pv4H_l1_draw, pvD_h1_draw, pvD_l1_draw, pvW_h1_draw: d['1W'].h1, pvW_l1_draw: d['1W'].l1 };
}

// ============= 方法 B：UDT + array + 迴圈（重構版）=============

function refactoredLogic(tfData, tol) {
  // isNearAny（array 版 + 早退出）
  const isNearAny = (price, others) => {
    for (const v of others) {
      if (v != null && Math.abs(price - v) <= tol) return true;
    }
    return false;
  };

  // 時區由大到小（1W 最大，5m 最小）
  const order = ['1W', '1D', '4H', '1H', '15m', '5m'];
  const levels = order.map(name => ({ name, ...tfData[name], h1Draw: tfData[name].h1, l1Draw: tfData[name].l1 }));

  // 每個時區：跟比它大的時區的 h1/l1 比
  for (let i = 1; i < levels.length; i++) {
    const current = levels[i];
    const largerValues = [];
    for (let j = 0; j < i; j++) {
      largerValues.push(levels[j].h1, levels[j].l1);
    }
    current.h1Draw = isNearAny(current.h1, largerValues) ? null : current.h1;
    current.l1Draw = isNearAny(current.l1, largerValues) ? null : current.l1;
  }

  return {
    pvW_h1_draw: levels[0].h1Draw, pvW_l1_draw: levels[0].l1Draw,
    pvD_h1_draw: levels[1].h1Draw, pvD_l1_draw: levels[1].l1Draw,
    pv4H_h1_draw: levels[2].h1Draw, pv4H_l1_draw: levels[2].l1Draw,
    pv1H_h1_draw: levels[3].h1Draw, pv1H_l1_draw: levels[3].l1Draw,
    pv15m_h1_draw: levels[4].h1Draw, pv15m_l1_draw: levels[4].l1Draw,
  };
}

// ============= 比較 =============

const origResult = originalLogic(tfData, tol);
const refResult = refactoredLogic(tfData, tol);

console.log('原版結果 vs 重構版結果：\n');
console.log('Key                 原版        重構版      一致?');
console.log('──────────────────  ─────────   ─────────   ──────');

const keys = ['pvW_h1_draw', 'pvW_l1_draw', 'pvD_h1_draw', 'pvD_l1_draw',
              'pv4H_h1_draw', 'pv4H_l1_draw', 'pv1H_h1_draw', 'pv1H_l1_draw',
              'pv15m_h1_draw', 'pv15m_l1_draw'];

let allMatch = true;
for (const k of keys) {
  const o = origResult[k];
  const r = refResult[k];
  const oStr = o === null ? 'null(隱藏)' : String(o);
  const rStr = r === null ? 'null(隱藏)' : String(r);
  const match = (o === null && r === null) || o === r;
  if (!match) allMatch = false;
  console.log(`${k.padEnd(18)}  ${oStr.padEnd(9)}   ${rStr.padEnd(9)}   ${match ? '✅' : '❌'}`);
}

console.log();
if (allMatch) {
  console.log('✅ 重構版與原版邏輯完全一致，可以實作');
} else {
  console.log('❌ 有差異，需要檢查重構邏輯');
}

// ============= 擴展性測試 =============

console.log('\n=== 擴展性測試 ===');
console.log('假設要加入 30m 時區，重構版只要在 order 和 tfData 加一項：\n');

const tfDataExt = {
  ...tfData,
  '30m': { h1: 4711, h2: 4718, l1: 4649, l2: 4658, enabled: true, showPrev: false },
};
// 模擬插入順序：1W, 1D, 4H, 1H, 30m, 15m, 5m
const orderExt = ['1W', '1D', '4H', '1H', '30m', '15m', '5m'];
const levelsExt = orderExt.map(name => ({ name, ...tfDataExt[name], h1Draw: tfDataExt[name].h1, l1Draw: tfDataExt[name].l1 }));

const isNearAnyArr = (price, others) => {
  for (const v of others) {
    if (v != null && Math.abs(price - v) <= tol) return true;
  }
  return false;
};

for (let i = 1; i < levelsExt.length; i++) {
  const current = levelsExt[i];
  const largerValues = [];
  for (let j = 0; j < i; j++) {
    largerValues.push(levelsExt[j].h1, levelsExt[j].l1);
  }
  current.h1Draw = isNearAnyArr(current.h1, largerValues) ? null : current.h1;
  current.l1Draw = isNearAnyArr(current.l1, largerValues) ? null : current.l1;
}

console.log('加入 30m 後：');
levelsExt.forEach(l => {
  console.log(`  ${l.name.padEnd(4)}: h1Draw=${l.h1Draw === null ? 'null' : l.h1Draw}, l1Draw=${l.l1Draw === null ? 'null' : l.l1Draw}`);
});

console.log('\n重構版加時區：只改 2 處（tfData + order）');
console.log('原版加時區：要改 20+ 處（每個時區的 _draw + merge text）');
