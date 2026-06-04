#!/usr/bin/env node
// format-jd.mjs — fetch 104 JD via honruch's script, format to job_description.md.
//
// Usage:
//   node format-jd.mjs <url|hashid> [--folder <name>] [--force]
//
// If --folder omitted, auto-generates: <n>_<company_slug>_<title_slug>
// Refuses to overwrite existing job_description.md unless --force given.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FETCH_SCRIPT = "/Users/nicholas/Desktop/Projects/104-jobhunt/scripts/job-detail.mjs";
const PROPOSALS_DIR = "/Users/nicholas/Desktop/WG-Portfolio/workspace/proposals";

function parseArgs(argv) {
  const out = { input: "", folder: "", force: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--folder") out.folder = argv[++i];
    else if (a === "--force") out.force = true;
    else if (!out.input) out.input = a;
  }
  if (!out.input) {
    process.stderr.write("usage: format-jd.mjs <url|hashid> [--folder <name>] [--force]\n");
    process.exit(1);
  }
  return out;
}

function fetchJD(input) {
  const r = spawnSync("node", [FETCH_SCRIPT, input], { encoding: "utf-8" });
  if (r.status !== 0) {
    process.stderr.write(`fetch failed (exit ${r.status}):\n${r.stderr}`);
    process.exit(2);
  }
  try {
    return JSON.parse(r.stdout);
  } catch (e) {
    process.stderr.write(`could not parse JSON from job-detail.mjs:\n${r.stdout.slice(0, 500)}\n`);
    process.exit(3);
  }
}

function autoFolder(jd) {
  const nums = readdirSync(PROPOSALS_DIR)
    .map((f) => /^(\d+)_/.exec(f))
    .filter(Boolean)
    .map((m) => Number(m[1]));
  const n = (nums.length ? Math.max(...nums) : 0) + 1;

  const company = (jd.company || "unknown")
    .replace(/股份有限公司|有限公司|股份/g, "")
    .trim();

  const title = (jd.title || "unknown")
    .replace(/[（(][^）)]*[）)]/g, " ")
    .replace(/[/／｜|]/g, " ")
    .replace(/[^\p{L}\p{N}\s_]/gu, " ")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();

  return `${n}_${company}_${title}`;
}

function formatLangs(langs) {
  if (!Array.isArray(langs) || !langs.length) return "未列出";
  return langs
    .map((l) => {
      const a = l.ability || {};
      return `${l.language}（聽${a.listening || "?"}、說${a.speaking || "?"}、讀${a.reading || "?"}、寫${a.writing || "?"}）`;
    })
    .join("；");
}

function extractRemote(jd) {
  const text = [jd.jobDescription, jd.welfare, jd.others].filter(Boolean).join("\n");
  if (/全(?:遠端|remote)|完全遠端/i.test(text)) return "全遠端";
  const m =
    text.match(/(?:混合|部分|hybrid)[^\n。]{0,40}遠端[^\n。]{0,40}/i) ||
    text.match(/遠端[^\n。]{0,50}/);
  return m ? m[0].trim() : "JD 未明確說明";
}

function buildMarkdown(jd) {
  const workTime =
    jd.workPeriod && jd.workPeriod.shifts
      ? Object.keys(jd.workPeriod.shifts).join("、")
      : "";

  return [
    jd.title || "",
    "",
    `- ${jd.company || ""}`,
    `- ${jd.jobUrl || ""}`,
    `- 上班地點: ${jd.location || ""}`,
    `- 工作待遇: ${jd.salary || ""}`,
    `- 工時: ${workTime}`,
    `- 遠端工作: ${extractRemote(jd)}`,
    `- 經歷／學歷: ${jd.workExp || ""} / ${jd.education || ""}`,
    `- 管理責任: ${jd.manageResp || ""}`,
    `- 出差: ${jd.businessTrip || ""}`,
    "",
    "---",
    "",
    "# 工作內容",
    "",
    jd.jobDescription || "",
    "",
    "---",
    "",
    jd.others || "",
    "",
    "【福利】",
    jd.welfare || "",
    "",
    "---",
    "",
    "## 補充欄位（104 結構化資料）",
    "",
    `- **相關科系**：${(jd.majors || []).join(" / ")}`,
    `- **JD 列出技能關鍵字**：${(jd.skills || []).join("、")}`,
    `- **JD 列出工具關鍵字**：${(jd.tools || []).join("、")}`,
    `- **語言要求**：${formatLangs(jd.langs)}`,
    "",
  ].join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const jd = fetchJD(args.input);
  const folder = args.folder || autoFolder(jd);
  const dir = join(PROPOSALS_DIR, folder);
  const target = join(dir, "job_description.md");

  if (existsSync(target) && !args.force) {
    process.stderr.write(`exists: ${target}\nre-run with --force to overwrite.\n`);
    process.exit(4);
  }

  mkdirSync(dir, { recursive: true });
  writeFileSync(target, buildMarkdown(jd));
  process.stdout.write(
    JSON.stringify(
      { folder, target, company: jd.company, title: jd.title, jobUrl: jd.jobUrl },
      null,
      2,
    ) + "\n",
  );
}

main();
