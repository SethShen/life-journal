# Life Journal · 生活记录

用 **Git 仓库**当内容管理系统，记录每一次出游。

> 想了解项目全貌（尤其是给 AI 看的），请先读 **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)**。
>
> **⚠️ 重要约定**：**每次更新项目后，必须同步更新 `PROJECT_SUMMARY.md`**。
> 包括目录结构、脚本、功能、内容规范、部署方式的所有改动，都要反映到那份文档里，
> 并在其第 11 节「变更日志」追加一条记录。这样才能保证任何 AI 接手时都能立刻理解项目。

---

## 怎么用（三步）

### 1. 新增一次出游

```bash
npm run new -- --slug sanya --title "三亚三日" --date 2026-01-01 --location "海南·三亚"
```

会生成：
- `content/2026-01-01-sanya.md` ← 写游记
- `photos/sanya/` ← 放照片

### 2. 放照片、写内容

把照片复制进 `photos/sanya/`，然后编辑 md 文件。

插图语法：

```markdown
![照片说明](photos:001.jpg)
```

### 3. 压缩、构建、提交

```bash
npm run compress    # 压缩照片（强烈建议）
npm run build       # 生成 public/
npm run dev         # 本地预览 http://localhost:8080

git add .
git commit -m "add trip: 三亚三日"
git push
```

推送后 Cloudflare Pages 自动部署，1 分钟内上线。

---

## 筛选与搜索

首页内置三种筛选，**可任意叠加**，全部在前端完成（点一下就响应，不重新加载）：

| 方式 | 操作 |
|---|---|
| **标签筛选** | 点顶部标签 chip，或直接点卡片上的标签 |
| **年份筛选** | 点「时间」行的年份 chip |
| **关键词搜索** | 搜索框输入，匹配标题 / 地点 / 摘要 / 标签 |

筛选状态会写进网址，**可直接分享或收藏**，例如：

```
https://你的站点.pages.dev/?tag=海边
https://你的站点.pages.dev/?year=2026
https://你的站点.pages.dev/?tag=海边&year=2026&q=三亚
```

标签和年份旁的**数字是记录条数**，按出现频次排序，最常用的排前面。

---

## 让 AI 帮你做

不想自己动手？直接对 AI 说：

> 我去了三亚，照片放在 `photos/sanya/`，玩了两天，第一天看海第二天吃海鲜，帮我加一篇。

AI 会按 `PROJECT_SUMMARY.md` 里的规范自动完成：建文件 → 写内容 → 压缩 → 构建 → 提交。

---

## 部署到 Cloudflare Pages

代码托管在 **GitHub 私有仓库** `SethShen/life-journal`，Cloudflare Pages 连GitHub 后 **push 即自动部署**。

1. 打开 [Cloudflare Pages](https://dash.cloudflare.com/) → Workers & Pages → Create
2. 选 **Pages** → **Connect to Git** → 授权 **GitHub** → 选 `life-journal` 仓库
3. 构建配置填：

   | 项 | 值 |
   |---|---|
   | Framework preset | None |
   | Production branch | `main` |
   | Build command | `npm run build` |
   | Build output directory | `public` |

4. 保存 → 自动部署 → 得到 `https://life-journal-xxx.pages.dev`

**本项目零第三方依赖**，Cloudflare 构建时不需要 `npm install` 也能跑通。

> 更详细的分步图文指引见 **[DEPLOY_CLOUDFLARE.md](./DEPLOY_CLOUDFLARE.md)**；
> 不想绑定 Git 仓库时可用 wrangler 手动上传（见该文件「替代方案」）。

---

## 目录速查

| 目录 | 作用 | 要改吗 |
|---|---|---|
| `content/` | 每篇游记一个 Markdown | ✅ 常改 |
| `photos/` | 照片，按 slug 分目录 | ✅ 常改 |
| `templates/` | HTML 骨架 | 🔧 改版式时 |
| `src/style.css` | 全站样式 | 🎨 改外观时 |
| `scripts/` | 构建/压缩/新建脚本 | ⚙️ 有需要时 |
| `public/` | 构建产物 | ❌ 不提交 |

---

## 环境要求

- Node.js >= 18
- 想用图片压缩：`npm i -D sharp`

---

## 常见问题

**照片会让仓库变得很大吗？**
会，所以务必先 `npm run compress`（压到长边 1920、质量 80）。手机原图 3-5MB，压缩后通常 300KB 左右。

**想改风格？**
改 `src/style.css`。配色集中在文件顶部的 CSS 变量里，改 `--accent` 就能换主色调。

**想让内容更私密？**
Cloudflare Pages 的网址知道链接就能访问。敏感照片不要上传，或使用 Cloudflare Access 加访问控制。
