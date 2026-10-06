#!/usr/bin/env node
/**
 * new-trip.js — 一键创建新游记骨架
 *
 * 用法：
 *   npm run new -- --slug sanya --title "三亚三日" --date 2026-01-01 --location "海南·三亚"
 *
 * 会创建：
 *   content/<date>-<slug>.md
 *   photos/<slug>/          （空目录，放照片用）
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

const slug = args.slug;
const title = args.title || slug;
const date = args.date || new Date().toISOString().slice(0, 10);
const location = args.location || '';

if (!slug) {
  console.error('✗ 缺少 --slug 参数。示例：');
  console.error('  npm run new -- --slug sanya --title "三亚三日" --date 2026-01-01 --location "海南·三亚"');
  process.exit(1);
}

const mdPath = path.join(CONTENT_DIR, `${date}-${slug}.md`);
const photoDir = path.join(PHOTOS_DIR, slug);

if (fs.existsSync(mdPath)) {
  console.error(`✗ 文件已存在：${path.relative(ROOT, mdPath)}`);
  process.exit(1);
}

const template = `---
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

fs.writeFileSync(mdPath, template, 'utf8');
fs.mkdirSync(photoDir, { recursive: true });

console.log('✓ 已创建：');
console.log(`   ${path.relative(ROOT, mdPath)}`);
console.log(`   ${path.relative(ROOT, photoDir)}/   ← 把照片放进这里`);
console.log('');
console.log('下一步：编辑 md 正文，然后 npm run compress && npm run build');
