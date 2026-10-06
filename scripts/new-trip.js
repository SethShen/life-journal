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
const slug = args.slug;
const title = args.title || slug;
const date = args.date || new Date().toISOString().slice(0, 10);
const location = args.location || '';
const birthdate = args.birthdate || '';
const milestone = args.milestone || '';
const age = args.age || '';

if (!slug) {
  console.error('✗ 缺少 --slug 参数。示例：');
  console.error('  游记：npm run new -- --slug sanya --title "三亚三日" --date 2026-01-01 --location "海南·三亚"');
  console.error('  成长：npm run new -- --growth --slug first-steps --title "第一次独立走路" --date 2026-01-18 --birthdate 2024-05-20');
  process.exit(1);
}

const contentDir = isGrowth ? path.join(CONTENT_DIR, 'growth') : CONTENT_DIR;
const mdPath = path.join(contentDir, `${date}-${slug}.md`);
const photoDir = path.join(PHOTOS_DIR, slug);

if (fs.existsSync(mdPath)) {
  console.error(`✗ 文件已存在：${path.relative(ROOT, mdPath)}`);
  process.exit(1);
}

const template = isGrowth
  ? `---
title: ${title}
date: ${date}
slug: ${slug}
birthdate: ${birthdate}
age: ${age || '（待填）'}
milestone: ${milestone}
summary: 一句话概括这一刻。
tags: [成长]
---

在这里写下这一刻的故事。

## 发生了什么

当时的情形……

![照片说明](photos:001.jpg)

## 她的反应

……
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
