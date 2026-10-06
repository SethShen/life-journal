# 部署与更新指引

## 当前状态

| 项 | 值 |
|---|---|
| **代码仓库** | git@github.com:SethShen/life-journal.git（私有 🔒） |
| 分支 | `main` |
| 托管平台 | GitHub |
| 部署平台 | Cloudflare Pages（连 GitHub，push 自动构建） |
| 远程同步 | ✅ 本地与远端一致 |

> 仓库已配置好。以后新增游记时按第三节流程走即可。

---

## 一、把项目拉到本地（首次）

本地还没有克隆的话：

```bash
git clone git@github.com:SethShen/life-journal.git
cd life-journal
```

本项目使用 **SSH** 方式连接（推荐，无需每次输入令牌）。若要用 HTTPS，需用 GitHub **私人令牌**（不是登录密码）代替密码。

---

## 二、部署方式

### 方案 A：Cloudflare Pages（在用，自动部署）

1. https://dash.cloudflare.com/ → **Workers & Pages** → **Create**
2. 选 **Pages** → **Connect to Git** → 授权 **GitHub** → 选 `life-journal`
3. 构建配置：

   | 项 | 值 |
   |---|---|
   | Project name | `life-journal` |
   | Production branch | `main` |
   | Framework preset | `None` |
   | Build command | `npm run build` |
   | Build output directory | `public` |
   | Root directory | 留空 |

4. **Save and Deploy**

之后每次 `git push` 自动重新构建部署，无需手动操作。

> 本项目**零第三方依赖**，Cloudflare 构建时不需要 `npm install`。

### 方案 B：wrangler 手动上传（备选）

不想让 Cloudflare 连接 GitHub 时使用：

```bash
npm install -g wrangler
wrangler login                              # 浏览器授权
npm run build
wrangler pages deploy public --project-name=life-journal
```

此方式**不会自动构建**，每次更新都要手动跑一遍。

> 分步图文版见 [DEPLOY_CLOUDFLARE.md](./DEPLOY_CLOUDFLARE.md)。

---

## 三、以后的更新流程

```bash
# 1. 新增一篇游记
npm run new -- --slug sanya --title "三亚三日" --date 2026-01-01 --location "海南·三亚"

# 2. 把照片放进 photos/sanya/

# 3. 编辑 content/2026-01-01-sanya.md

# 4. 压缩、构建、本地预览
npm run compress
npm run build
npm run dev          # 打开 http://localhost:8080 看效果

# 5. 提交推送（push 后 Cloudflare 自动部署）
git add .
git commit -m "add trip: 三亚三日"
git push
```

---

## 四、环境要求

- **Node.js >= 18**（推荐 20/22）
- 图片压缩需安装：`npm i -D sharp`（不装也能构建，只是照片不压缩）

---

## 五、常用排查

| 现象 | 原因与处理 |
|---|---|
| `git push` 失败 | SSH 未配置。检查 `~/.ssh/id_rsa` 是否已加入 GitHub：Settings → SSH keys |
| Cloudflare 构建失败 | 看构建日志。本项目零依赖，若报模块找不到，多半是误加了 `npm install` 步骤 |
| 部署成功但页面没照片 | 检查 `public/photos/` 是否生成。本地跑一次 `npm run build` 确认 |
| 部署成功但样式错乱 | `public/style.css` 未生成，检查 `src/style.css` 是否存在 |

---

## ⚠️ 安全提醒

1. **令牌不要提交到仓库**。如需 HTTPS 推送，令牌只在命令行输入，让系统凭证管理器记住。
2. 仓库是**私有**的，照片不会在GitHub 上公开。
   但 **Cloudflare Pages 生成的网址是公开可访问的**，知道链接即可查看。**敏感照片建议不要上传**，或用 Cloudflare Access 加访问控制。
3. 建议给 GitHub 账号开启两步验证。
