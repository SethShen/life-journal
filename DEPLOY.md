# 部署与更新指引

## 当前状态

| 项 | 值 |
|---|---|
| **代码仓库** | https://gitee.com/seth_shen/life-journal （私有 🔒） |
| 分支 | `main` |
| 文件数 | 114 |
| 推送状态 | ✅ 已完成 |

> 仓库已配置好。以后新增游记时按第三节流程走即可。

---

## 一、把项目拉到本地（首次）

本地还没有克隆的话：

```bash
git clone https://gitee.com/seth_shen/life-journal.git
cd life-journal
```

拉取时输入 Gitee 用户名和**私人令牌**（不是登录密码）。

---

## 二、部署方式

### 方案 A：Gitee Pages

Gitee Pages 免费版需要**实名认证**，且是**手动部署**（改完要手动点"更新"）。

1. 打开 https://gitee.com/seth_shen/life-journal/pages
2. 按提示完成实名认证
3. 部署分支选 `master`
4. 点「启动」/「更新」

> Gitee Pages 传统上只认 `master` 分支。需要的话：
> ```bash
> git branch master && git push origin master
> ```

### 方案 B：Cloudflare Pages（推荐，自动部署）

支持连 Gitee 仓库，push 后自动构建，不用手动点。

1. https://dash.cloudflare.com/ → **Workers & Pages** → **Create**
2. 选 **Pages** → **Connect to Git** → 授权 Gitee → 选 `life-journal`
3. 构建配置：

   | 项 | 值 |
   |---|---|
   | Framework preset | `None` |
   | Build command | `npm run build` |
   | Build output directory | `public` |

4. **Save and Deploy**

之后每次 `git push` 自动重新部署。

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

# 5. 提交推送
git add .
git commit -m "add trip: 三亚三日"
git push
```

---

## 四、环境要求

- **Node.js >= 18**
- 图片压缩需安装：`npm i -D sharp`

---

## ⚠️ 安全提醒

1. **私人令牌不要提交到仓库**。推送时在命令行输入，让系统凭证管理器记住即可。
2. 你的令牌曾出现在聊天记录中，**建议现在去撤销**：
   https://gitee.com/profile/personal_access_tokens
   撤销后重新生成，权限勾选 `projects`（含仓库读写）。
3. 仓库是**私有**的，照片不会公开在 Gitee 上。
   但 **Pages 生成的网址是公开可访问的**，知道链接即可查看。敏感照片建议不要上传。
4. 建议开启 Gitee 的登录二次验证。
