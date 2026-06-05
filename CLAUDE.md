# WG-Portfolio

求職作品集 repo，核心展示「用 Claude Code 設計 Skills / Hooks / 工作流」的能力。

## 目錄結構

| 路徑 | 內容 |
| ---- | ---- |
| `imgs/` | 文件用圖片（**已版控**，可壓縮覆寫，需要時 `git checkout` 還原） |
| `portfolio/eagle/`、`portfolio/trading/` | 實戰案例——**展示素材**，多由其他專案搬來，非本 repo 運作的系統 |
| `workspace/` | 過渡討論、求職準備、**resume（履歷）**、**proposals（概念設計，未驗證）**、**skills（本 repo 自用 skill，見下）**——僅本機，已 `.gitignore` |

> ⚠️ `portfolio/eagle/`、`portfolio/trading/` 底下的 `*_skill_proposal.md`、design-docs 是**作品集內容**，
> 用來呈現我駕馭 Claude Code 的思路，**不是**本 repo 安裝啟用的 skill。
> 本 repo 真正掛載運作的 skill 在 `workspace/skills/`（本機留存、不版控）。
> proposals 同樣已移到 `workspace/proposals/`（本機留存、不版控）。

## Skill 配置慣例（重要）

本 repo 自用的 skill 目前兩支（屬 repo 基礎設施，跟「想展示的經驗」無關，故**不放 GitHub**，
真檔留在 gitignore 的 `workspace/skills/`）：

| Skill | 用途 |
| ----- | ---- |
| `compress-img` | 智慧壓縮圖片：PNG→optipng 無損、JPG→djpeg\|cjpeg 有損 q80，預設覆寫原檔 |
| `fetch-jd` | 抓 104 職缺 JD 寫成 `job_description.md` 到 `workspace/proposals/` 資料夾 |

**配置原則 —— skill 真檔放在 `workspace/skills/`（本機、不版控），靠 symlink 掛到 `~/.claude`，不把配置寫進 `.claude`：**

```
~/.claude/skills/<name>  ──symlink──►  workspace/skills/<name>/
```

實際現況：
```
~/.claude/skills/compress-img  ──►  …/skills/compress-img/   (SKILL.md + compress.sh)
~/.claude/skills/fetch-jd      ──►  …/skills/fetch-jd/       (SKILL.md + format-jd.mjs)
```

**為什麼這樣配**：
- `.claude/` 有自我保護（編輯一律跳權限詢問、allow 規則蓋不掉）。把真檔放 `workspace/skills/`、只用 symlink 掛出去，
  **編輯走真實路徑就不會每次被要求重新授權**。
- `workspace/` 與 `.claude/` 都已在 `.gitignore` 排除——這些自用 skill 與任何 `.claude` 配置都不進 repo、不上 GitHub。

**新增一支 skill 的步驟**：
1. 在 `workspace/skills/<name>/` 建 `SKILL.md`（frontmatter: `name` / `description`（含觸發詞）/ `allowed-tools`），需要時加輔助腳本。
2. 建 symlink：`ln -sfn "$(pwd)/workspace/skills/<name>" ~/.claude/skills/<name>`
3. **編輯一律改 `workspace/skills/` 真檔**，別動 `~/.claude/skills/` 那條 symlink 指向的東西以外的路徑。

## 慣例

- `imgs/` 的圖片已版控，`compress-img` 預設覆寫原檔安全（可 git 還原）；不確定時加 `--keep`。
- 文件內圖片引用用**相對路徑**，從 .md 所在目錄往上算（例：`portfolio/trading/skills/` 到 `imgs/` 是 `../../../imgs/...`）。
