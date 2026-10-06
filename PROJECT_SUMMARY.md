# PROJECT SUMMARY — Life Journal

> **给 AI 助手的入口文档。**
> 如果你（AI）被要求修改、扩展或维护这个项目，请先完整读完本文，再动手。
> 本文档是项目的唯一权威说明，优先级高于任何零散注释。

---

## ⚠️ 第 0 条：文档同步义务（最高优先级，先读这条）

**任何一次对项目的改动，都必须同步更新本文档。**

这不是"建议"，是**必须执行的收尾步骤**。具体要求：

1. **改代码前**：先读本文档，确认理解现有架构与约束。
2. **改代码后，提交前**：检查本文档是否需要同步修改。需要同步的内容包括但不限于：
   - 新增/删除/重命名**文件或目录** → 更新第 3 节「目录结构」
   - 新增/修改**构建逻辑、脚本命令** → 更新第 5 节、第 9 节
   - 新增/修改**功能**（筛选、排序、地图等）→ 在该功能对应章节补充说明
   - 修改**内容格式规范**（front-matter 字段、图片语法）→ 更新第 4 节
   - 修改**部署方式** → 更新第 7 节
   - 新增**已知坑或约束** → 更新第 8 节
3. **每次改动**：在文末第 11 节「变更日志」**追加一条记录**（日期 + 改了什么 + 为什么）。
4. **交付前自检**：确认本文档描述的内容与仓库**实际状态一致**。文档过期等同于 bug。

> **判断标准**：如果一个新的 AI 读了本文档后，据此操作会出错或困惑，说明本文档没更新到位。

---

## 1. 这是什么

一个**个人生活/旅行记录网站**，核心特征：

- **内容是「出游一次 → 更新一次」**，不是后台手动新建
- **更新方式是提交代码**（Git 工作流），不是 CMS 后台
- **由 AI 协助生成内容**：用户口述 + 丢照片，AI 生成游记 Markdown
- **照片存放在代码仓库**里，随内容一起版本化
- **双内容通道**：`content/` 存本人旅行游记，`content/growth/` 存女儿的成长记录，首页分页签展示

一句话：**Git 就是数据库，Markdown 就是内容，push 就是发布。**

---

## 2. 技术栈与架构

| 层 | 选型 | 说明 |
|---|---|---|
| 内容源 | Markdown（`content/*.md`） | 每次出游一个文件 |
| 资源 | 照片（`photos/<slug>/*.jpg`） | 压缩后提交 |
| 构建 | Node.js 脚本（`scripts/build.js`） | md + 照片 → 静态 HTML |
| 输出 | `public/` | 构建产物，**不提交到 git** |
| 托管 | GitHub 仓库（私有） | 存代码与照片 |
| 部署 | Cloudflare Pages | 连 GitHub，push 自动构建发布 |
| 样式 | 原生 CSS（无框架） | 零依赖，好维护 |

### 数据流

```
content/*.md  +  photos/**  +  templates/**
                    │
                    ▼
        scripts/build.js  (Node, 无第三方依赖)
                    │
                    ▼
              public/*.html  +  public/photos/**
                    │
                    ▼
   Cloudflare Pages 自动构建 → https://xxx.pages.dev
```

---

## 3. 目录结构

```
life-journal/
├── PROJECT_SUMMARY.md      ← 本文档（AI 入口，唯一权威）
├── AGENTS.md               ← AI 工作约定（强制同步本文档）
├── DEPLOY.md               ← 日常更新与推送流程
├── DEPLOY_CLOUDFLARE.md    ← Cloudflare Pages 部署详解（含wrangler 备选方案）
├── .codebuddy-memory.md    ← 项目持久化记忆
├── README.md               ← 给人看的使用说明
├── package.json            ← 脚本入口（build / dev / new / compress）
├── content/                ← 【旅行游记区】
│   ├── _template.md        ← 新游记模板
│   ├── 2024-07-15-qinghai.md
│   ├── 2024-10-02-beijing.md
│   ├── 2025-03-20-hangzhou.md
│   ├── 2025-08-08-xiamen.md
│   ├── 2026-01-01-sample-trip.md
│   ├── 2026-04-12-chengdu.md
│   └── 2026-06-08-qinggan-2026.md      ← 78 张照片，最大的一篇
│   └── growth/             ← 【成长足迹区】女儿成长记录
│       ├── _template.md    ← 成长记录模板
│       ├── 2026-01-18-first-steps.md
│       └── 2026-02-09-first-word-mama.md
├── photos/                 ← 【资源区】按 slug 分目录
│   ├── beijing/  chengdu/  hangzhou/  qinghai/
│   ├── qinggan-2026/       ← 78 张
│   ├── sample-trip/  xiamen/
│   └── first-steps/  first-word-mama/   ← 成长记录照片
├── templates/              ← 【模板区】HTML 骨架
│   ├── index.html          ← 首页（页签切换 + 旅程筛选 + 成长时间轴）
│   ├── trip.html           ← 旅行详情页（含灯箱）
│   └── growth.html         ← 成长记录详情页（含灯箱）
├── scripts/
│   ├── build.js            ← 构建：md → html（旅行 + 成长双通道）
│   ├── compress-images.js  ← 压缩照片（需 npm i -D sharp）
│   ├── new-trip.js         ← 一键创建新游记 / 成长记录骨架
│   └── dev.js              ← 本地预览服务器（8080）
├── src/
│   └── style.css           ← 全站样式（CSS 变量集中配色，含深色模式）
├── public/                 ← 构建产物（.gitignore 已忽略，不提交）
│   ├── index.html
│   ├── trip/<slug>.html    ← 旅行详情页
│   └── growth/<slug>.html  ← 成长详情页
└── .github/workflows/
    └── deploy.yml          ← GitHub Pages 部署（私有仓库下实际不可用，仅留档）
```

> 注：`.gitignore` 中已忽略 `screenshots/`、`public/`、`node_modules/`、`*.log`，这些目录不出现在仓库中。

---

## 4. 内容格式规范（AI 必读）

### 4.1 文件命名

```
content/YYYY-MM-DD-slug.md
```

- `YYYY-MM-DD`：出游**开始**日期，决定时间线排序
- `slug`：英文短横线，**必须与 `photos/<slug>/` 目录名一致**

### 4.2 Front-matter（YAML 头）

每篇md **必须**以以下头部开始：

```yaml
---
title: 三亚三日
date: 2026-01-01
location: 海南·三亚
slug: sanya-2026
cover: 001.jpg
summary: 第一次冬天去看海，风很大，心很静。
tags: [旅行, 海边, 冬季]
---
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `title` | ✅ | 标题 |
| `date` | ✅ | 起始日期，ISO 格式 |
| `location` | ✅ | 地点，显示在卡片上 |
| `slug` | ✅ | 唯一标识，**等于照片目录名** |
| `cover` | ⬜ | 封面图文件名（相对 `photos/<slug>/`），缺省取第一张 |
| `summary` | ⬜ | 一句话摘要，用于首页卡片 |
| `tags` | ⬜ | 标签数组 |

### 4.2.1 成长记录 Front-matter（成长足迹专用）

成长记录放在 **`content/growth/`**，字段略有不同：

```yaml
---
title: 第一次独立走路
date: 2026-01-18
slug: first-steps
birthdate: 2024-05-20
age: 1 岁 8 个月
milestone: 第一次
summary: 从沙发到餐桌，五步，摇摇晃晃。
tags: [第一次, 大运动]
---
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `title` | ✅ | 标题 |
| `date` | ✅ | 这一天发生的日期，ISO 格式（**决定时间轴排序**） |
| `slug` | ✅ | 唯一标识，等于照片目录名 |
| `birthdate` | ⬜ | 出生日期，用于自动算年龄 |
| `age` | ⬜ | 手动指定的年龄文案，如 `1 岁 8 个月`。**优先于自动计算** |
| `milestone` | ⬜ | 里程碑标记，如 `第一次`、`百日`、`周岁` |
| `summary` | ⬜ | 一句话摘要，显示在时间轴卡片上 |
| `tags` | ⬜ | 标签数组 |
| `cover` | ⬜ | 封面图，缺省取第一张 |

> **年龄显示规则**：`age` 字段优先；未填时由 `build.js` 的 `formatAge(birthdate, date)` 自动计算。
> 3 岁以内会显示到「天」，更大只显示到「月」。

### 4.3 正文

- 用标准 Markdown
- **插图语法**（自定义）：

```markdown
![描述文字](photos:001.jpg)
```

构建时 `photos:001.jpg` 会被替换为 `photos/<slug>/001.jpg`。

- 正文中**不要**写 HTML 的 `<html>/<body>`，只写内容片段。

---

## 5. 构建产物说明

`scripts/build.js` 生成：

| 输出 | 来源 |
|---|---|
| `public/index.html` | 旅行 md 按 date 倒序 → 卡片墙 + 筛选栏 + 成长时间轴（双视图） |
| `public/trip/<slug>.html` | 旅行 md → 详情页 |
| `public/growth/<slug>.html` | 成长 md → 成长详情页 |
| `public/photos/**` | 从 `photos/` 复制 |
| `public/style.css` | 从 `src/style.css` 复制 |

构建脚本特点：**零第三方依赖**，只用 Node 内置模块（`fs`/`path`）。这样在任何环境都能跑，不会因 npm 挂掉而失效。

### 5.0 双内容通道

项目有**两类内容**，由 `build.js` 的 `readRecords(dir, base)` 统一读取：

| 通道 | 源目录 | 详情页路径 | 归属人 |
|---|---|---|---|
| 旅行 | `content/*.md` | `trip/<slug>.html` | 本人 |
| 成长 | `content/growth/*.md` | `growth/<slug>.html` | 女儿 |

`content/growth/` 不存在时会自动降级为空，**不影响旅行站的构建**。

### 5.0.1 成长足迹页签

首页顶部有「旅程 / 成长足迹」两个页签，纯前端切换，不重新请求页面。

| 维度 | 实现 |
|---|---|
| 切换 | `templates/index.html` 内的 `setView(name, pushUrl)`，切换 `.view` 容器的 `hidden` |
| URL | `?view=growth`（可分享、可收藏），用 `history.pushState` 写入，筛选参数用 `replaceState` |
| 前进后退 | 监听 `popstate` 恢复对应视图 |
| 成长视图展示 | 按**月份分节**的竖向时间轴（年份 + 月份标签），节点显示日、年龄、里程碑标签 |
| 空状态 | 无成长记录时显示提示文案 |
| 联动 | 副标题的成长条数仅在成长视图显示；切视图时清掉另一视图的筛选参数 |

**时间轴的月份分节逻辑**：在 `build.js` 中按 `date.slice(0,7)` 聚合，月份**倒序**排列（最新在前），节内保持日期倒序。

### 5.1 筛选功能（前端实现，无需重新构建）

首页内嵌一段原生 JS，支持三种筛选方式，**可叠加**：

| 维度 | 交互 | URL 参数 |
|---|---|---|
| 标签 | 点标签 chip，或点卡片上的标签 | `?tag=海边` |
| 年份 | 点时间 chip | `?year=2026` |
| 关键词 | 搜索框（防抖 180ms），匹配标题/地点/摘要/标签 | `?q=成都` |

**实现机制：**

- 构建时给每张卡片注入 `data-tags` / `data-year` / `data-month` / `data-search` 属性
- 筛选时用 JS 切换卡片的 `hidden` 属性（`display: none`），**不重新请求页面**
- 标签与年份 chip 由构建脚本按**出现频次倒序**生成，并显示计数
- 筛选状态实时同步到 URL（`history.replaceState`），**可分享、可收藏**
- 详情页的标签是 `<a href="../index.html?tag=xxx">`，点击跳回首页并自动筛选
- 无结果时显示空状态，提供「清除筛选」

**加筛选维度时**：在 `build.js` 的卡片模板里加 `data-xxx`，再在 `templates/index.html` 的脚本里加一条判断即可。

### 5.2 Markdown 渲染能力（自研解析器）

`build.js` 内的 `renderMarkdown()` 是个**手写的极简 Markdown 解析器**（零依赖）。当前支持：

| 语法 | 说明 |
|---|---|
| `#` / `##` / `###` | 标题 |
| `**粗体**` / `*斜体*` / `` `代码` `` | 行内格式 |
| `> 引用` | 引用块 |
| `- 列表` | 无序列表 |
| `[文字](链接)` | 超链接 |
| `![alt](url)` | 普通图片 |
| `![alt](photos:文件名)` | **自定义语法**，自动补全为 `photos/<slug>/文件名` |
| `\| 表格 \|` | 表格（含表头，自动包 `.table-wrap` 支持横向滚动） |

> **改 Markdown 语法支持时**：必须同步更新本表。

### 5.3 详情页照片策略

- **正文中已引用的照片**：就近渲染为 `<figure class="photo">`（带图注）
- **未被正文引用的照片**：自动归入底部「其余照片」九宫格
- 构建脚本通过正则 `photos:(\S+)` 扫描正文，得出「已引用集合」，再取差集
- **点击任意图片 → 全屏灯箱**：支持左右切换、键盘 `←/→/Esc`、显示 `当前/总数`

### 5.4 页面脚本

| 页面 | 内联脚本功能 |
|---|---|
| `index.html` | 页签切换（旅程/成长）、三向筛选（标签/年份/关键词）、URL 同步、空状态 |
| `trip.html` | 图片灯箱（放大、切换、键盘操作） |
| `growth.html` | 图片灯箱（同上） |

均**无外部 JS 依赖**，原生实现。

> **模板变量注意**：`applyTemplate()` 只支持 `{{name}}` 简单替换，**不支持** `{{#condition}}` / `{{^}}` 这类 mustache 条件语法。
> 需要条件渲染时，改用「始终输出 + JS 控制显隐」或「由 build.js 拼接好字符串再传入」。

---

## 6. 用户更新流程（最重要）

用户**不需要**懂代码。标准流程：

```
1. 把这次出游的照片放进 photos/<新slug>/
2. 对 AI 说："我去了XX，照片在 photos/XX/，帮我加一篇"
3. AI：
     a. 运行 npm run new -- --slug XX --title "..." --date ... --location "..."
     b. 编辑 content/<date>-XX.md，按用户口述补全正文与 front-matter
     c. 运行 npm run compress   （压缩照片）
     d. 本地 npm run build 验证
     e. **核对 PROJECT_SUMMARY.md 是否需要同步更新**（见第 0 条）
     f. 若本次有结构性改动，在第 11 节「变更日志」追加记录
     g. git add / commit / push
4. Cloudflare 自动构建 → 1 分钟内线上更新
```

> **注意**：如果只是**新增一篇游记内容**（不改代码、不改结构），通常不需要改本文档，
> 但仍需在第 11 节追加一行「新增游记」记录，保持内容台账完整。
> 但凡**动了代码、脚本、模板、样式、目录结构**，就**必须**同步更新对应章节。

### AI 执行时的硬性规则

1. **每次只新增一个 `content/<slug>.md`**，不要改动其他已存在的 md。
2. **不要删除、重命名已有文章**，除非用户明确要求。
3. **slug 一旦确定不可变**（它同时是照片目录名和 URL）。
4. 提交前**必须**跑一次 `npm run build`，确认无报错、`public/index.html` 里能看到新条目。
5. commit message 格式：`add trip: <title> (<date>)`（新增游记）或 `<type>: <描述>`（代码改动）。
6. 照片**必须先压缩**再提交，否则仓库会迅速膨胀。
7. **提交前必须检查本文档是否同步**（见第 0 条），并更新第 11 节变更日志。

---

## 7. 部署说明

### 仓库信息

| 项 | 值 |
|---|---|
| **远程仓库** | git@github.com:SethShen/life-journal.git（**私有**） |
| 平台 | GitHub（私有仓库） |
| 分支 | `main` |
| 托管方式 | Cloudflare Pages 连GitHub，push 自动构建发布 |

> ⚠️ **历史说明**：2026-10-06 之前本文档曾错误地记为「Gitee 私有仓库」。实际从未使用 Gitee，代码始终托管在 GitHub。该错误已于 2026-10-06 修正。

### 方案 A：Cloudflare Pages（推荐，唯一在用）

连GitHub 仓库，push 后自动构建，无需手动操作。

1. https://dash.cloudflare.com/ → **Workers & Pages** → **Create**
2. 选 **Pages** → **Connect to Git** → 授权 **GitHub** → 选 `life-journal`
3. 构建配置：

   | 字段 | 值 |
   |---|---|
   | Project name | `life-journal` |
   | Production branch | `main` |
   | Framework preset | `None` |
   | Build command | `npm run build` |
   | Build output directory | `public` |
   | Root directory | 留空 |

4. Save and Deploy → 得到 `https://life-journal-xxx.pages.dev`

**本项目零第三方依赖**，Cloudflare 构建时无需 `npm install` 即可完成构建。

### 方案 B：wrangler 命令行手动上传（备选）

不想让 Cloudflare 连接 GitHub 时使用。详见 `DEPLOY_CLOUDFLARE.md`。

```bash
npm install -g wrangler
wrangler login
npm run build
wrangler pages deploy public --project-name=life-journal
```

> 此方式**不会自动构建**，每次更新都要手动跑一次。

### 方案 C：GitHub Pages（备选）

`.github/workflows/deploy.yml` 已就绪。因为仓库是**私有**的，GitHub Pages 免费版不托管私有仓库，此方案实际不可用，仅作留档。

> 完整操作步骤见 `DEPLOY.md`（日常更新流程）与 `DEPLOY_CLOUDFLARE.md`（Cloudflare 部署详解）。

---

## 8. 已知约束与坑

| 约束 | 说明 | 应对 |
|---|---|---|
| 仓库体积 | git 历史永久保留大文件 | 提交前压缩照片；不要反复删传 |
| 单文件上限 | GitHub 单文件 100MB | 压缩后远低于此 |
| Pages 公开性 | 生成的网址知道链接即可访问 | 敏感照片不要上传，或加访问控制 |
| `.gitignore` | `public/` 和 `node_modules/` 必须忽略 | 已配置 |
| 国内访问 | `pages.dev` 偶尔波动 | 可绑定自有域名 |

---

## 9. 常用命令

```bash
# 新增旅行游记
npm run new -- --slug sanya --title "三亚三日" --date 2026-01-01 --location "海南·三亚"

# 新增成长记录（--growth 会写入 content/growth/）
npm run new -- --growth --slug first-steps --title "第一次独立走路" \
  --date 2026-01-18 --birthdate 2024-05-20 --milestone 第一次

npm run compress          # 压缩 photos/ 下所有图片
npm run build             # 生成 public/
npm run dev               # 构建 + 本地预览 (http://localhost:8080)
```

---

## 10. 给 AI 的一句话交接

> 这是「Git 即 CMS」的静态生活记录站。内容分两路：`content/*.md`（本人旅行），
> `content/growth/*.md`（女儿成长记录），首页双页签切换，成长记录按月分节的时间轴展示。
> 照片是 `photos/<slug>/`，构建是 `scripts/build.js`（零依赖），部署靠 Cloudflare Pages 自动。
> **加一篇旅行 = 新增一个 md + 一个照片目录 + push**；**加一条成长记录 = 同上，但放`content/growth/`**。
> 改样式只动 `src/style.css` 和 `templates/`。
> **改完任何东西，记得回来更新本文档。**

---

## 11. 变更日志

> **规则**：每次改动都在此**追加**一行（不要删除历史记录）。新记录写在**最上面**。
> 格式：`日期 | 类型 | 说明`

| 日期 | 类型 | 说明 |
|---|---|---|
| 2026-10-06 | feat | **新增「成长足迹」功能**：首页加「旅程 / 成长足迹」双页签（纯前端切换，`?view=growth` 可分享、支持前进后退）；新增 `content/growth/` 内容通道与 `growth/<slug>.html` 详情页（复用灯箱）；旅行与成长共用 `readRecords()` 统一读取，`content/growth/` 缺失时自动降级；`build.js` 新增 `formatAge()` 自动算年龄（3 岁内到天、更大到月）、按月分组的时间轴生成（月份倒序）；`new-trip.js` 新增 `--growth` 参数；新增 `templates/growth.html`；`style.css` 新增页签与时间轴样式（含移动端适配）；示例内容 2 篇（第一次独立走路 / 会说「妈妈」了）。第 3、4、5、9 节已同步 |
| 2026-10-06 | chore | GitHub 仓库改名：`SethShen/life-journa` → **`SethShen/life-journal`**（修正手误，末尾补l）；本地 remote 已同步更新，fetch/push 验证通过。文档内的仓库名引用在上一条修订时已全部写成正确名，无需改动 |
| 2026-10-06 | docs | **修正部署信息错误**：第 7 节原写「Gitee 私有仓库 + Gitee Pages」为**事实错误**，实际代码始终托管在 GitHub（`git@github.com:SethShen/life-journal.git`，私有）。重写第 7 节为「Cloudflare Pages 连 GitHub（唯一在用）」+ wrangler 备选 + GitHub Pages 留档；第 3 节目录结构补`DEPLOY_CLOUDFLARE.md`、移除不存在的 `screenshots/`、补全 7 篇游记与 91 张照片的实际清单；README / DEPLOY.md / .codebuddy-memory.md 同步对齐 |
| 2026-10-06 | chore | **仓库托管切换至 Gitee**（`gitee.com/seth_shen/life-journal`，私有），因开发环境无法访问 GitHub；新增 `DEPLOY.md` 部署指引；第 7 节重写（**已于同日撤销，实际未使用 Gitee，见上一条**） |
| 2026-10-01 | content | 集成**青甘大环线六日自驾**游记（`2026-06-08-qinggan-2026.md`）：37 个站点、78 张照片（压缩后 9.8MB），原文一字未改，按 Day1-6 分章节 |
| 2026-10-01 | feat | Markdown 解析器新增**表格支持**；详情页新增**灯箱**（全屏放大/切换/键盘操作）；照片改为「正文引用优先、其余进底册」策略；详情页头部显示照片总数 |
| 2026-10-01 | docs | 新增 `AGENTS.md`（AI 工作约定）与 `.codebuddy-memory.md`（项目记忆）；第 3 节目录结构补充 AGENTS.md / screenshots / dev.js；确立「每次更新必须同步本文档」为强制约定 |
| 2026-10-01 | docs | 增加第 0 条「文档同步义务」，明确每次改动必须同步本文档；新增第 11 节变更日志；在用户更新流程中加入文档维护步骤 |
| 2026-10-01 | feat | 新增标签过滤、年份筛选、关键词搜索（纯前端，URL 可分享）；标签/年份 chip 按频次排序并显示计数；详情页标签改为可点击跳转筛选 |
| 2026-10-01 | feat | 项目初始化：Git-as-CMS 静态站点骨架，含构建脚本、图片压缩、一键建游记、本地预览、Cloudflare/GitHub Pages 部署配置 |

---

## 附：目录结构速查（与第 3 节一致，供快速参考）

```
content/      每篇游记一个 md（常改）
photos/       照片，按 slug 分目录（常改）
templates/    HTML 骨架（改版式时）
src/style.css 全站样式（改外观时）
scripts/      构建/压缩/新建/预览脚本
public/       构建产物（不提交）
```

