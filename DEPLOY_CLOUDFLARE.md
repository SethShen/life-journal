# Cloudflare Pages 部署指引

> 照着这张清单走，10 分钟能上线。

---

## 前置检查

构建配置已在项目中就绪，无需修改任何代码：

| 项 | 值 |
|---|---|
| Build command | `npm run build` |
| Output directory | `public` |
| Node 版本 | 18+（项目要求，Cloudflare 默认即可） |
| 依赖 | **零第三方依赖**（不需要 `npm install` 也能构建） |

---

## 步骤一：注册 / 登录 Cloudflare

https://dash.cloudflare.com/sign-up

用邮箱注册即可，**免费版完全够用**（每月 500 次构建、无限流量）。

---

## 步骤二：创建 Pages 项目

1. 登录后，左侧菜单点 **Workers & Pages**
2. 点 **Create**（或 Create application）
3. 切到 **Pages** 标签页
4. 点 **Connect to Git**

---

## 步骤三：连接 Gitee 仓库

这是关键一步。

**如果看到 Gitee 选项：**
- 点 **Gitee** → 授权登录 → 选择 `life-journal` 仓库

**如果只看到 GitHub / GitLab：**
- 说明 Cloudflare 当前界面没有直接给 Gitee 入口
- **改用「直接上传」方式**（见下方「替代方案」）

> ⚠️ 注意：Cloudflare 对 Gitee 的支持时有时无。如果找不到 Gitee，别纠结，走替代方案。

---

## 步骤四：填写构建配置

连接仓库后，会看到配置表单，**照这个填**：

| 字段 | 填什么 |
|---|---|
| Project name | `life-journal`（或你喜欢的名字） |
| Production branch | `main` |
| Framework preset | **None** |
| Build command | `npm run build` |
| Build output directory | `public` |
| Root directory | （留空） |

**环境变量**：不需要填任何东西。

点 **Save and Deploy**。

---

## 步骤五：等待部署

约 30 秒 ~ 2 分钟。成功后会给你一个网址：

```
https://life-journal-xxx.pages.dev
```

点进去应该能看到你的记录站首页。

---

## 步骤六（可选）：绑定自己的域名

如果你有域名：
1. 项目页 → **Custom domains** → **Set up a custom domain**
2. 输入域名 → 按提示在域名服务商处加 CNAME 记录
3. 等生效（通常几分钟）

绑定后国内访问会稳定很多。

---

## 替代方案：直接上传（无需连 Git）

如果 Cloudflare 连不上 Gitee，用这个：

**方法 1：网页拖拽上传**

1. Workers & Pages → Create → Pages → **Upload assets**
2. 项目名填 `life-journal`
3. 把 `public/` 文件夹**整个拖进去**
4. 点 Deploy

**方法 2：命令行上传（推荐，可重复）**

在你本地项目目录执行：

```bash
# 安装 wrangler
npm install -g wrangler

# 登录（会打开浏览器授权）
wrangler login

# 部署（把 public/ 传上去）
wrangler pages deploy public --project-name=life-journal
```

以后每次更新：

```bash
npm run build
wrangler pages deploy public --project-name=life-journal
```

**注意**：直接上传方式**不会自动构建**，每次都要本地构建好再传。

---

## 常见问题

**Q：构建失败怎么办？**
看构建日志。八成是 Node 版本问题。在项目 Settings → Environment variables 加：
```
NODE_VERSION = 18
```

**Q：照片没显示？**
检查 `public/photos/` 有没有被正确上传。本地执行 `npm run build` 后，`public/` 里应该有 `photos/` 目录。

**Q：部署后中文乱码？**
不太可能，页面已声明 `<meta charset="UTF-8">`。如果真遇到，检查构建产物编码。

**Q：网址是公开的吗？**
是。`xxx.pages.dev` 谁拿到链接都能访问。你的照片会公开。
需要私密的话，Cloudflare 有 **Access** 功能（付费套餐含），可以加登录验证。

**Q：每次更新都要手动部署吗？**
- 走 Git 连接：**自动**，push 后自动重新构建
- 走直接上传：**手动**，要跑一次 `wrangler pages deploy`

---

## 部署后的更新流程

```bash
# 1. 新增游记
npm run new -- --slug sanya --title "三亚三日" --date 2026-01-01 --location "海南·三亚"
# 2. 放照片到 photos/sanya/
# 3. 编辑 content/2026-01-01-sanya.md
# 4. 构建
npm run compress && npm run build
# 5. 推送
git add . && git commit -m "add trip: 三亚三日" && git push
# 6. Cloudflare 自动部署（若走 Git 连接）
```

---

## 需要帮助？

卡在哪一步了，把**截图或错误信息**发我，我帮你定位。
