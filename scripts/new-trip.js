#!/usr/bin/env node
/**
 * new-trip.js — 一键创建新游记 / 成长记录骨架
 *
 * 用法：
 *   npm run new -- --slug sanya --title "三亚三日" --date 2026-01-01 --location "海南·三亚"
 *   npm run new -- --growth --slug first-steps --title "第一次独立走路" --date 2026-01-18 --birthdate 2024-05-20
 *
 * 会创建：
 *   游记：   content/<date>-<slug>.md  +  photos/<slug>/
 *   成长记录：content/growth/<date>-<slug>.md  +  photos/<slug>/
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const PHOTOS_DIR = path.join(ROOT, 'photos');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[key] = val;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

const isGrowth = Boolean(args.growth);
const date = args.date || new Date().toISOString().slice(0, 10);
const location = args.location || '';
const birthdate = args.birthdate || '';
const age = args.age || '';

// 成长记录：slug 缺省用月份（如 2026-03），标题默认「小雨的X月」
const month = args.month || date.slice(0, 7);
const MONTH_CN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
const monthCn = MONTH_CN[parseInt(month.slice(5, 7), 10) - 1] || month;

const slug = args.slug || (isGrowth ? month : '');
const title = args.title || (isGrowth ? `小雨的${monthCn}` : slug);

if (!slug) {
  console.error('✗ 缺少 --slug 参数。示例：');
  console.error('  游记：npm run new -- --slug sanya --title "三亚三日" --date 2026-01-01 --location "海南·三亚"');
  console.error('  成长：npm run new -- --growth --date 2026-03-31 --birthdate 2024-05-20');
  process.exit(1);
}

const contentDir = isGrowth ? path.join(CONTENT_DIR, 'growth') : CONTENT_DIR;
// 成长记录按月建档，文件名直接用 slug（月份），不再加日期前缀
const fileBase = isGrowth ? slug : `${date}-${slug}`;
const mdPath = path.join(contentDir, `${fileBase}.md`);
const photoDir = path.join(PHOTOS_DIR, slug);

if (fs.existsSync(mdPath)) {
  console.error(`✗ 文件已存在：${path.relative(ROOT, mdPath)}`);
  process.exit(1);
}

const template = isGrowth
  ? `---
title: 小雨的${monthCn}
date: ${date}
month: ${month}
slug: ${month}
birthdate: ${birthdate}
summary: 一句话概括这个月。
tags: [出行]
cover: 001.jpg
---

## 序

> 这个月去了哪里，去了几次。
> 天气、气温、穿了什么。

## 01 站点名

> 地点。海拔或时长。
> 客观事实描述，40–80 字。

::: stats
900 m | 海拔
18 ℃ | 气温
:::

![图说：四到八字](photos:001.jpg)

![图说：五到八字](photos:002.jpg)

## 02 站点名

> 地点。第二站的内容。

![图说：四到八字](photos:003.jpg)

## 本月小结

> 几趟出行，几张照片。
> ${monthCn}结束。
`
  : `---
title: ${title}
date: ${date}
location: ${location}
slug: ${slug}
cover: 001.jpg
summary: 一句话概括这次旅程。
tags: [旅行]
---

在这里写下这次旅途的故事。可以分小节：

## 第一天

![清晨的海边](photos:001.jpg)

当天发生了什么……

## 第二天

继续记录……
`;

fs.mkdirSync(contentDir, { recursive: true });
fs.writeFileSync(mdPath, template, 'utf8');
fs.mkdirSync(photoDir, { recursive: true });

console.log('✓ 已创建：');
console.log(`   ${path.relative(ROOT, mdPath)}`);
console.log(`   ${path.relative(ROOT, photoDir)}/   ← 把照片放进这里`);
console.log('');
console.log('下一步：编辑 md 正文，然后 npm run compress && npm run build');
