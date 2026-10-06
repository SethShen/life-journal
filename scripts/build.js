#!/usr/bin/env node
/**
 * build.js — 把 content/*.md + photos/ 构建成静态站点 public/
 *
 * 设计原则：零第三方依赖，只用 Node 内置模块。
 * 这样在任何环境（CI / 本地 / 别人的机器）都能直接跑。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const PHOTOS_DIR = path.join(ROOT, 'photos');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const SRC_DIR = path.join(ROOT, 'src');
const OUT_DIR = path.join(ROOT, 'public');

// ---------- 工具函数 ----------

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 极简 YAML front-matter 解析（只支持 key: value 和 tags: [a, b]） */
function parseFrontMatter(raw) {
  const match = raw.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();

    // 数组：[a, b, c]
    if (/^\[.*\]$/.test(val)) {
      val = val
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else {
      val = val.replace(/^["']|["']$/g, '');
    }
    meta[key] = val;
  }
  return { meta, body: match[2] };
}

/**
 * 极简 Markdown → HTML
 * @param {string} md   正文
 * @param {string} slug 文章 slug
 * @param {string} base 资源路径前缀（'' = 首页同级；'..' = trip/ 子目录）
 */
function renderMarkdown(md, slug, base = '') {
  const prefix = base ? `${base}/` : '';
  let html = escapeHtml(md);

  // 1) 自定义图片语法 photos:xxx.jpg → <img>
  html = html.replace(/!\[([^\]]*)\]\(photos:([^)]+)\)/g, (_, alt, file) => {
    const src = `${prefix}photos/${slug}/${file.trim()}`;
    return `<figure class="photo"><img src="${src}" alt="${alt}" loading="lazy"><figcaption>${alt}</figcaption></figure>`;
  });

  // 2) 普通图片
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    return `<img src="${src}" alt="${alt}" loading="lazy">`;
  });

  // 3) 表格（| a | b |\n|---|---|\n| c | d |）
  html = html.replace(
    /(^\|.+\|[ \t]*\r?\n\|[\s:|-]+\|[ \t]*\r?\n(?:\|.*\|[ \t]*\r?\n?)*)/gm,
    (block) => {
      const rows = block.trim().split(/\r?\n/);
      if (rows.length < 3) return block;
      const split = (r) =>
        r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = split(rows[0]);
      const bodyRows = rows.slice(2).map(split);
      const th = head.map((c) => `<th>${c}</th>`).join('');
      const tb = bodyRows
        .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
        .join('');
      return `<div class="table-wrap"><table><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table></div>`;
    }
  );

  // 4) 标题
  html = html.replace(/^###\s+(.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');

  // 5) 引用
  html = html.replace(/^&gt;\s?(.*)$/gm, '<blockquote>$1</blockquote>');

  // 6) 无序列表
  html = html.replace(/^[-*]\s+(.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>');

  // 7) 粗体 / 斜体 / 行内代码
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 8) 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // 9) 段落（连续非空行合并为 <p>）
  const blocks = html.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  html = blocks
    .map((b) => {
      if (/^<(h\d|ul|ol|li|blockquote|figure|img|pre|div|p|table)/.test(b)) return b;
      return `<p>${b.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');

  return html;
}

function readTemplate(name) {
  const p = path.join(TEMPLATES_DIR, name);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function applyTemplate(tpl, vars) {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    return vars[key] !== undefined ? vars[key] : '';
  });
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ---------- 主流程 ----------

function main() {
  console.log('🏗  Building life-journal ...');

  // 清理旧产物
  if (fs.existsSync(OUT_DIR)) fs.rmSync(OUT_DIR, { recursive: true, force: true });
  ensureDir(OUT_DIR);
  ensureDir(path.join(OUT_DIR, 'trip'));

  // 读取所有 md
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error('✗ content/ 目录不存在');
    process.exit(1);
  }

  const files = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'));

  const trips = files.map((file) => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
    const { meta, body } = parseFrontMatter(raw);

    const base = file.replace(/\.md$/, '');
    const slug = meta.slug || base.replace(/^\d{4}-\d{2}-\d{2}-/, '') || slugify(meta.title || base);

    // 收集该 slug 下的照片
    const photoDir = path.join(PHOTOS_DIR, slug);
    let photos = [];
    if (fs.existsSync(photoDir)) {
      photos = fs
        .readdirSync(photoDir)
        .filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f))
        .sort();
    }

    const cover = meta.cover || photos[0] || '';

    return {
      file,
      slug,
      title: meta.title || base,
      date: meta.date || base.slice(0, 10),
      location: meta.location || '',
      summary: meta.summary || '',
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      cover,
      photos,
      html: renderMarkdown(body, slug, '..'),
      bodyRaw: body,
    };
  });

  // 按日期倒序
  trips.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  // ---- 生成首页 ----
  const indexTpl = readTemplate('index.html');
  const cards = trips
    .map((t) => {
      const coverSrc = t.cover ? `photos/${t.slug}/${t.cover}` : '';
      const coverBlock = coverSrc
        ? `<img class="card-cover" src="${coverSrc}" alt="${escapeHtml(t.title)}" loading="lazy">`
        : `<div class="card-cover card-cover--empty">✦</div>`;
      const tags = t.tags
        .map(
          (tag) =>
            `<button class="tag" type="button" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`
        )
        .join('');

      const year = String(t.date).slice(0, 4);
      const month = String(t.date).slice(0, 7);
      const searchText = [t.title, t.location, t.summary, t.tags.join(' ')]
        .join(' ')
        .toLowerCase();

      return `
      <a class="card" href="trip/${t.slug}.html"
         data-tags='${escapeHtml(JSON.stringify(t.tags))}'
         data-year="${escapeHtml(year)}"
         data-month="${escapeHtml(month)}"
         data-search="${escapeHtml(searchText)}">
        ${coverBlock}
        <div class="card-body">
          <div class="card-meta"><time>${escapeHtml(t.date)}</time>${t.location ? `<span class="loc">${escapeHtml(t.location)}</span>` : ''}</div>
          <h2 class="card-title">${escapeHtml(t.title)}</h2>
          ${t.summary ? `<p class="card-summary">${escapeHtml(t.summary)}</p>` : ''}
          <div class="card-tags">${tags}</div>
        </div>
      </a>`;
    })
    .join('\n');

  // 统计：标签频次（按出现次数倒序）、年份列表（倒序）
  const tagCount = {};
  const yearCount = {};
  for (const t of trips) {
    for (const tag of t.tags) tagCount[tag] = (tagCount[tag] || 0) + 1;
    const y = String(t.date).slice(0, 4);
    yearCount[y] = (yearCount[y] || 0) + 1;
  }

  const tagFilters = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(
      ([tag, n]) =>
        `<button class="chip" type="button" data-filter-tag="${escapeHtml(tag)}">${escapeHtml(
          tag
        )}<span class="chip-n">${n}</span></button>`
    )
    .join('');

  const yearFilters = Object.entries(yearCount)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(
      ([y, n]) =>
        `<button class="chip" type="button" data-filter-year="${escapeHtml(y)}">${escapeHtml(
          y
        )}<span class="chip-n">${n}</span></button>`
    )
    .join('');

  // 时间轴分组的年份（供 JS 生成分节）
  const timelineYears = Object.keys(yearCount).sort((a, b) => b.localeCompare(a));

  const indexHtml = applyTemplate(indexTpl, {
    cards,
    count: trips.length,
    tag_filters: tagFilters,
    year_filters: yearFilters,
    timeline_years: JSON.stringify(timelineYears),
    site_title: '生活记录',
    updated: new Date().toISOString().slice(0, 10),
  });
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), indexHtml);

  // ---- 生成详情页 ----
  const tripTpl = readTemplate('trip.html');
  for (const t of trips) {
    // 找出正文中被引用的图片
    const usedInBody = new Set();
    const re = /photos:([A-Za-z0-9._-]+)/g;
    let mm;
    while ((mm = re.exec(t.bodyRaw)) !== null) usedInBody.add(mm[1]);

    // 未被正文引用的照片 → 底部相册
    const restPhotos = t.photos.filter((p) => !usedInBody.has(p));

    let gallery = '';
    if (restPhotos.length) {
      gallery =
        `<h2 class="gallery-title">其余照片</h2><div class="gallery">` +
        restPhotos
          .map(
            (p) =>
              `<a class="gallery-item" href="../photos/${t.slug}/${p}" target="_blank" rel="noopener">` +
              `<img src="../photos/${t.slug}/${p}" alt="" loading="lazy"></a>`
          )
          .join('') +
        `</div>`;
    }

    const tags = t.tags
      .map(
        (tag) =>
          `<a class="tag" href="../index.html?tag=${encodeURIComponent(tag)}">${escapeHtml(tag)}</a>`
      )
      .join('');

    const html = applyTemplate(tripTpl, {
      title: escapeHtml(t.title),
      date: escapeHtml(t.date),
      location: escapeHtml(t.location),
      tags,
      content: t.html + gallery,
      photo_count: t.photos.length,
      site_title: '生活记录',
    });
    fs.writeFileSync(path.join(OUT_DIR, 'trip', `${t.slug}.html`), html);
  }

  // ---- 复制资源 ----
  copyDir(PHOTOS_DIR, path.join(OUT_DIR, 'photos'));
  if (fs.existsSync(path.join(SRC_DIR, 'style.css'))) {
    fs.copyFileSync(path.join(SRC_DIR, 'style.css'), path.join(OUT_DIR, 'style.css'));
  }

  console.log(`✓ Built ${trips.length} trip(s) → public/`);
  trips.forEach((t) => console.log(`   · ${t.date}  ${t.title}  (${t.photos.length} photos)`));
}

main();
