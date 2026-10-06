#!/usr/bin/env node
/**
 * build.js — 把 content/*.md + photos/ 构建成静态站点 public/
 *
 * 设计原则：零第三方依赖，只用 Node 内置模块。
 * 这样在任何环境（CI / 本地 / 别人的机器）都能直接跑。
 */

const fs = require('fs');
const path = require('path');
const { ROUTE_CSS, renderRoutePage } = require('./route-page');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const GROWTH_DIR = path.join(CONTENT_DIR, 'growth');
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

/** 去掉成对引号 */
function unquote(s) {
  const t = String(s).trim();
  if (/^".*"$/.test(t) || /^'.*'$/.test(t)) {
    return t.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return t;
}

/** 解析行内数组 [a, b, c]，支持引号内含逗号 */
function parseInlineArray(val) {
  const inner = val.slice(1, -1).trim();
  if (!inner) return [];
  const out = [];
  let buf = '';
  let inStr = null;
  for (const ch of inner) {
    if (inStr) {
      if (ch === inStr) inStr = null;
      else buf += ch;
    } else if (ch === '"' || ch === "'") inStr = ch;
    else if (ch === ',') { out.push(buf.trim()); buf = ''; }
    else buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  if (out.length && out.every((x) => x !== '' && !isNaN(Number(x)))) {
    return out.map(Number);
  }
  return out;
}

/**
 * 极简 YAML front-matter 解析
 *  - 简单键值：key: value
 *  - 行内数组：key: [a, b, c]
 *  - 嵌套对象数组：key: 后接 `- k: v` 缩进块（route: 行程数据用）
 */
function parseFrontMatter(raw) {
  const match = raw.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const lines = match[1].split(/\r?\n/);
  const meta = {};

  /** 解析 `- k: v` 起始的对象块，返回 {obj, nextIndex} */
  function parseItem(idx, indent) {
    const line = lines[idx];
    const m0 = line.match(/^\s*-\s+(.*)$/);
    if (!m0) return null;
    const obj = {};
    const kv = m0[1].match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (kv) {
      const v = kv[2].trim();
      obj[kv[1]] = /^\[.*\]$/.test(v) ? parseInlineArray(v) : unquote(v);
    }
    let k = idx + 1;
    while (k < lines.length) {
      const l2 = lines[k];
      if (!l2.trim()) { k++; continue; }
      const ind2 = l2.length - l2.trimStart().length;
      if (ind2 <= indent) break;
      const kv2 = l2.match(/^\s*([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
      if (!kv2) { k++; continue; }
      const v2 = kv2[2].trim();
      if (v2 === '') {
        // 子数组：如 spots: / food:
        // 结构为 `- k: v` 后接更深缩进的续行，需复用 parseItem 逻辑
        const sub = [];
        let m2 = k + 1;
        const subIndent = ind2;
        while (m2 < lines.length) {
          const l3 = lines[m2];
          if (!l3.trim()) { m2++; continue; }
          const ind3 = l3.length - l3.trimStart().length;
          if (ind3 <= subIndent) break;
          if (/^\s*-\s+/.test(l3)) {
            const r2 = parseItem(m2, ind3);
            if (r2) { sub.push(r2.obj); m2 = r2.next; continue; }
          }
          m2++;
        }
        obj[kv2[1]] = sub;
        k = m2;
        continue;
      }
      obj[kv2[1]] = /^\[.*\]$/.test(v2) ? parseInlineArray(v2) : unquote(v2);
      k++;
    }
    return { obj, next: k };
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const top = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!top) continue;
    const key = top[1];
    const val = top[2].trim();

    if (val === '') {
      // 顶层键后接缩进块 → 对象数组
      let j = i + 1;
      let baseIndent = null;
      const items = [];
      while (j < lines.length) {
        const l = lines[j];
        if (!l.trim()) { j++; continue; }
        const ind = l.length - l.trimStart().length;
        if (ind === 0) break;
        if (baseIndent === null) baseIndent = ind;
        if (ind < baseIndent) break;
        if (ind === baseIndent && /^\s*-\s+/.test(l)) {
          const r = parseItem(j, baseIndent);
          if (r) { items.push(r.obj); j = r.next; continue; }
        }
        j++;
      }
      meta[key] = items.length ? items : '';
      i = j - 1;
      continue;
    }

    meta[key] = /^\[.*\]$/.test(val) ? parseInlineArray(val) : unquote(val);
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

  // 1.5) 视频 ![说明](video:xxx.mp4) → <video>，可选封面 video:xxx.mp4|video_poster.jpg
  html = html.replace(/!\[([^\]]*)\]\(video:([^)|]+)(?:\|([^)]+))?\)/g, (_, alt, file, poster) => {
    const src = `${prefix}photos/${slug}/${file.trim()}`;
    const posterAttr = poster
      ? ` poster="${prefix}photos/${slug}/${poster.trim()}"`
      : '';
    return (
      `<figure class="video">` +
      `<video controls playsinline preload="metadata"${posterAttr}>` +
      `<source src="${src}" type="video/mp4">你的浏览器不支持视频播放。</video>` +
      (alt ? `<figcaption>${alt}</figcaption>` : '') +
      `</figure>`
    );
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

  // 3.5) 数据卡（::: stats  数值 | 标签）
  // 逐行扫描，遇到 ::: stats 后收集所有含| 的行为卡片，直到空行或非数据行
  html = html
    .split('\n')
    .reduce((acc, line) => {
      if (/^:::\s*stats\s*$/.test(line.trim())) {
        acc.push({ stats: true, rows: [] });
        return acc;
      }
      const cur = acc[acc.length - 1];
      if (cur && cur.stats) {
        if (line.trim() && line.includes('|')) {
          cur.rows.push(line.trim());
          return acc;
        }
        // 结束数据卡
        const cards = cur.rows
          .map((r) => {
            const [num, ...rest] = r.split('|');
            const label = rest.join('|').trim();
            return `<div class="stat"><div class="stat-num">${num.trim()}</div><div class="stat-lab">${label}</div></div>`;
          })
          .join('');
        acc.push(`<div class="stats">${cards}</div>`);
        acc.push({ stats: false, rows: [] });
        return acc;
      }
      acc.push(line);
      return acc;
    }, [])
    .map((x) => (typeof x === 'string' ? x : ''))
    .filter((x, i, arr) => !(x === '' && arr[i - 1] === ''))
    .join('\n');

  // 4) 标题
  html = html.replace(/^###\s+(.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');

  // 5) 引用 —— 先把「连续 > 行」合并成一个引用块，再包标签
  html = html.replace(/((?:^&gt;.*$\r?\n?)+)/gm, (block) => {
    const inner = block
      .trim()
      .split(/\r?\n/)
      .map((l) => l.replace(/^&gt;\s?/, ''))
      .filter((l) => l.length)
      .join('<br>');
    return `<blockquote>${inner}</blockquote>`;
  });

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

/** 2026-01 → 一月 */
function monthCn(ym) {
  const names = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
  const mm = parseInt(String(ym).slice(5, 7), 10);
  return names[mm - 1] || String(ym);
}

/**
 * 读取一个内容目录，返回记录数组。
 * @param {string} dir内容目录
 * @param {string} base 资源路径前缀（'' = 首页同级；'..' = 子目录）
 */
function readRecords(dir, base = '..') {
  if (!fs.existsSync(dir)) return [];

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'));

  return files.map((file) => {
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    const { meta, body } = parseFrontMatter(raw);

    const nameBase = file.replace(/\.md$/, '');
    const slug =
      meta.slug || nameBase.replace(/^\d{4}-\d{2}-\d{2}-/, '') || slugify(meta.title || nameBase);

    // 收集该 slug 下的照片
    const photoDir = path.join(PHOTOS_DIR, slug);
    let photos = [];
    if (fs.existsSync(photoDir)) {
      photos = fs
        .readdirSync(photoDir)
        .filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f))
        .sort();
    }

    // 视频封面（被 video:xxx.mp4|video_poster.jpg 引用的）不算「照片」，
    // 不计入 photo_count，也不进底部「其余照片」相册
    const videoPosters = new Set();
    const posterRe = /video:[^)|]+\|([^)|]+)/g;
    let pm;
    while ((pm = posterRe.exec(body)) !== null) videoPosters.add(pm[1].trim());
    if (videoPosters.size) {
      photos = photos.filter((f) => !videoPosters.has(f));
    }

    // 校验：视频封面若与正文引用的照片同名，会造成计数与画面不一致
    if (videoPosters.size) {
      const usedInBody = new Set();
      const re = /photos:([A-Za-z0-9._-]+)/g;
      let mm;
      while ((mm = re.exec(body)) !== null) usedInBody.add(mm[1]);
      for (const p of videoPosters) {
        if (usedInBody.has(p)) {
          console.warn(
            `⚠️ ${file}: 视频封面 ${p} 同时被 photos: 引用，计数可能不一致`
          );
        }
      }
    }

    const cover = meta.cover || photos[0] || '';

    return {
      file,
      slug,
      title: meta.title || nameBase,
      date: meta.date || nameBase.slice(0, 10),
      location: meta.location || '',
      summary: meta.summary || '',
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      cover,
      photos,
      // 成长足迹专属字段
      month: meta.month || String(meta.date || nameBase).slice(0, 7),
      monthCn: monthCn(meta.month || meta.date || nameBase),
      // 行程数据（可选）：front-matter 的 map: true + route: 缩进块
      map: /^(true|yes|1)$/i.test(String(meta.map).trim()),
      route: Array.isArray(meta.route) ? meta.route : null,
      html: renderMarkdown(body, slug, base),
      bodyRaw: body,
    };
  });
}

/** 未被正文引用的照片 → 底部相册 */
function renderGallery(rec) {
  const usedInBody = new Set();
  const re = /photos:([A-Za-z0-9._-]+)/g;
  let mm;
  while ((mm = re.exec(rec.bodyRaw)) !== null) usedInBody.add(mm[1]);

  const restPhotos = rec.photos.filter((p) => !usedInBody.has(p));
  if (!restPhotos.length) return '';

  return (
    `<h2 class="gallery-title">其余照片</h2><div class="gallery">` +
    restPhotos
      .map(
        (p) =>
          `<a class="gallery-item" href="../photos/${rec.slug}/${p}" target="_blank" rel="noopener">` +
          `<img src="../photos/${rec.slug}/${p}" alt="" loading="lazy"></a>`
      )
      .join('') +
    `</div>`
  );
}

// ---------- 主流程 ----------

function main() {
  console.log('🏗  Building life-journal ...');

  // 清理旧产物
  if (fs.existsSync(OUT_DIR)) fs.rmSync(OUT_DIR, { recursive: true, force: true });
  ensureDir(OUT_DIR);
  ensureDir(path.join(OUT_DIR, 'trip'));

  // 读取所有 md —— content/ 为旅行，content/growth/ 为成长足迹
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error('✗ content/ 目录不存在');
    process.exit(1);
  }

  const trips = readRecords(CONTENT_DIR);
  const growth = readRecords(GROWTH_DIR);

  // 成长记录：按日期倒序
  const growthRecords = growth.sort((a, b) => String(b.date).localeCompare(String(a.date)));

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

  // ---- 成长足迹：月度相册卡片墙 ----
  // 每月一版，杂志竖版结构（页眉大号月份 → 封面 → 编号站点 → 页脚小结）
  const growthHtml = growthRecords
    .map((g) => {
      const yy = String(g.month).slice(0, 4);
      const mm = String(g.month).slice(5, 7);
      const cover = g.cover
        ? `<img class="al-cover" src="photos/${g.slug}/${g.cover}" alt="" loading="lazy">`
        : `<div class="al-cover al-cover--empty">✦</div>`;
      const tagPills = (g.tags || [])
        .map((tag) => `<span class="al-tag">${escapeHtml(tag)}</span>`)
        .join('');

      return `
      <a class="album" href="growth/${g.slug}.html">
        <div class="al-masthead">
          <div class="al-mh-left">
            <span class="al-kicker">GROWING FOOTPRINTS</span>
            <h3 class="al-title">${escapeHtml(g.title)}</h3>
            ${tagPills ? `<div class="al-tags">${tagPills}</div>` : ''}
          </div>
          <div class="al-mh-right">
            <span class="al-yy">${escapeHtml(yy)}</span>
            <span class="al-mm">${escapeHtml(mm)} 月</span>
          </div>
        </div>
        ${cover}
        ${g.summary ? `<p class="al-summary">${escapeHtml(g.summary)}</p>` : ''}
      </a>`;
    })
    .join('\n');

  const growthCountText = growthRecords.length ? `${growthRecords.length} 个月` : '';

  const indexHtml = applyTemplate(indexTpl, {
    cards,
    count: trips.length,
    tag_filters: tagFilters,
    year_filters: yearFilters,
    growth_albums: growthHtml,
    growth_count_text: escapeHtml(growthCountText),
    site_title: '生活记录',
    updated: new Date().toISOString().slice(0, 10),
  });
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), indexHtml);

  // ---- 生成旅行详情页 ----
  const tripTpl = readTemplate('trip.html');
  for (const t of trips) {
    const tags = t.tags
      .map(
        (tag) =>
          `<a class="tag" href="../index.html?tag=${encodeURIComponent(tag)}">${escapeHtml(tag)}</a>`
      )
      .join('');

    // 行程页：map: true 时在正文前插入地图 + Day 面板
    const routeBlock =
      t.map && t.route && t.route.length ? renderRoutePage(t.route, '..', t.slug) : '';

    const html = applyTemplate(tripTpl, {
      title: escapeHtml(t.title),
      date: escapeHtml(t.date),
      location: escapeHtml(t.location),
      tags,
      content: routeBlock + t.html + renderGallery(t),
      photo_count: t.photos.length,
      route_css: routeBlock ? ROUTE_CSS : '',
      site_title: '生活记录',
    });
    fs.writeFileSync(path.join(OUT_DIR, 'trip', `${t.slug}.html`), html);
  }

  // ---- 生成成长足迹详情页（杂志竖版） ----
  const growthTpl = readTemplate('growth.html');
  ensureDir(path.join(OUT_DIR, 'growth'));
  for (const g of growthRecords) {
    const tags = (g.tags || [])
      .map(
        (tag) =>
          `<a class="tag" href="../index.html?view=growth&tag=${encodeURIComponent(tag)}">${escapeHtml(tag)}</a>`
      )
      .join('');

    const yy = String(g.month).slice(0, 4);
    const mm = String(g.month).slice(5, 7);

    const html = applyTemplate(growthTpl, {
      title: escapeHtml(g.title),
      date: escapeHtml(g.date),
      year: escapeHtml(yy),
      month_num: escapeHtml(mm),
      month_cn: escapeHtml(g.monthCn),
      tags,
      content: g.html + renderGallery(g),
      photo_count: g.photos.length,
      site_title: '生活记录',
    });
    fs.writeFileSync(path.join(OUT_DIR, 'growth', `${g.slug}.html`), html);
  }

  // ---- 复制资源 ----
  copyDir(PHOTOS_DIR, path.join(OUT_DIR, 'photos'));
  if (fs.existsSync(path.join(SRC_DIR, 'style.css'))) {
    fs.copyFileSync(path.join(SRC_DIR, 'style.css'), path.join(OUT_DIR, 'style.css'));
  }

  console.log(`✓ Built ${trips.length} trip(s) + ${growthRecords.length} growth record(s) → public/`);
  trips.forEach((t) => console.log(`   · ${t.date}  ${t.title}  (${t.photos.length} photos)`));
  growthRecords.forEach((g) =>
    console.log(`   · ${g.date}  [成长] ${g.title}  (${g.photos.length} photos)`)
  );
}

main();
