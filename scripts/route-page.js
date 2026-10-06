/**
 * route-page.js — 行程页渲染（带地图 + Day 面板）
 *
 * 当 front-matter 含 `map: true` 与 `route:` 时，由 build.js 调用。
 * 产出：地图容器 + 路线图例 + 8 天 Day 切换面板（景点/美食/酒店卡片）。
 * 依赖**本地** Leaflet（src/vendor/leaflet/，经 build.js 复制到 public/vendor/），
 * 瓦片用高德（CARTO/OSM 在国内不可达）。地图失败时降级为纯 Day 面板。
 */

/** 行程页所需的 CSS（注入到页面 <style> 里） */
const ROUTE_CSS = `
.rt-map{position:relative;height:420px;border-radius:14px;overflow:hidden;margin:28px 0 12px;background:var(--al-green-soft,#eaf0e7);border:1px solid var(--border,#ece7e0)}
/* 注意：不要再给地图容器加 height:100%。
   Leaflet 会把 leaflet-container 类加到同一个 div 上，而父级高度是 auto，
   百分比高度会退化成 auto → 容器塌成 0 高，地图整个不可见（踩过此坑）。
   高度只由上面 .rt-map 的 420px 决定。 */
.rt-legend{display:flex;flex-wrap:wrap;gap:14px;margin-bottom:24px;font-size:12px;color:var(--text-muted,#8a8178)}
.rt-legend span{display:inline-flex;align-items:center;gap:5px}
.rt-dot{width:9px;height:9px;border-radius:50%;display:inline-block}
.rt-nav{display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;margin-bottom:20px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.rt-nav::-webkit-scrollbar{display:none}
.rt-nav button{flex:none;padding:8px 14px;border:1px solid var(--border,#ece7e0);background:var(--surface,#fff);color:var(--text-muted,#8a8178);font-family:inherit;font-size:13px;border-radius:20px;cursor:pointer;white-space:nowrap;transition:all .18s}
.rt-nav button:hover{border-color:var(--al-green,#3a6a4a);color:var(--al-green,#3a6a4a)}
.rt-nav button.is-on{background:var(--al-green,#3a6a4a);border-color:var(--al-green,#3a6a4a);color:#fff}
.rt-day{display:none}
.rt-day.is-on{display:block}
.rt-head{margin-bottom:18px}
.rt-date{font-size:12px;letter-spacing:.18em;color:var(--al-green,#3a6a4a);font-weight:600;margin-bottom:6px}
.rt-label{font-size:26px;font-weight:700;letter-spacing:-.01em;margin:0 0 8px}
.rt-meta{display:flex;flex-wrap:wrap;gap:10px;font-size:12.5px;color:var(--text-muted,#8a8178)}
.rt-meta em{font-style:normal;color:var(--al-green,#3a6a4a);font-weight:600}
.rt-hotel{margin-top:12px;padding:10px 14px;background:var(--al-green-soft,#eaf0e7);border-radius:8px;font-size:13px;color:var(--al-ink-2,#5f594f)}
.rt-hotel b{color:var(--al-green,#3a6a4a);font-weight:600}
.rt-group{margin-top:24px}
.rt-group-title{font-size:12px;letter-spacing:.2em;color:var(--al-ink-3,#a49c90);font-weight:600;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--al-line,#e2ddd3)}
.rt-card{margin-bottom:16px;padding:16px 18px;background:var(--surface,#fff);border:1px solid var(--border,#ece7e0);border-radius:12px}
.rt-card-head{display:flex;align-items:baseline;gap:10px;margin-bottom:6px}
.rt-card-name{font-size:16px;font-weight:600;margin:0}
.rt-card-desc{margin:0 0 12px;font-size:14px;line-height:1.8;color:var(--al-ink-2,#5f594f)}
.rt-shots{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px}
.rt-shots img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;cursor:zoom-in;display:block}
.rt-fallback{padding:14px 16px;background:#fdf6e8;border:1px solid #f0d9a8;border-radius:10px;font-size:13px;color:#7a5c1e;margin-bottom:18px}
@media(max-width:640px){.rt-map{height:300px}.rt-label{font-size:21px}.rt-shots{grid-template-columns:repeat(2,1fr)}.rt-card{padding:14px}.rt-nav{-webkit-mask-image:linear-gradient(90deg,#000 88%,transparent);mask-image:linear-gradient(90deg,#000 88%,transparent)}}
`;

/**
 * 渲染行程页 HTML
 * @param {Array} route  行程天数数组
 * @param {string} base  资源路径前缀（详情页为 '..'）
 * @param {string} slug
 */
function renderRoutePage(route, base, slug) {
  if (!Array.isArray(route) || !route.length) return '';

  const esc = (s) =>
    String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  // 多行文本：先转义再换行转 <br>（正文里手写的换行在卡片里要保留，否则会挤成一段）
  const escBr = (s) => esc(s).replace(/\r?\n/g, '<br>');

  const prefix = base ? base + '/' : '';

  // ---- Day 导航 ----
  const nav = route
    .map(
      (d, i) =>
        `<button type="button" class="rt-nav-btn${i === 0 ? ' is-on' : ''}" data-rt-day="${i}">Day ${esc(
          d.day
        )}</button>`
    )
    .join('');

  // ---- 每天面板 ----
  const panels = route
    .map((d, i) => {
      const shots = (list) =>
        (list || [])
          .map(
            (s) =>
              `<img src="${prefix}photos/${slug}/${esc(s)}" alt="${esc(s)}" loading="lazy">`
          )
          .join('');

      const spotCards = (d.spots || [])
        .map(
          (s) => `<div class="rt-card">
        <div class="rt-card-head"><h4 class="rt-card-name">${esc(s.name)}</h4></div>
        ${s.desc ? `<p class="rt-card-desc">${escBr(s.desc)}</p>` : ''}
        ${(s.photos || []).length ? `<div class="rt-shots">${shots(s.photos)}</div>` : ''}
      </div>`
        )
        .join('');

      const foodCards = (d.food || [])
        .map(
          (f) => `<div class="rt-card">
        <div class="rt-card-head"><h4 class="rt-card-name">${esc(f.name)}</h4></div>
        ${f.desc ? `<p class="rt-card-desc">${escBr(f.desc)}</p>` : ''}
        ${(f.photos || []).length ? `<div class="rt-shots">${shots(f.photos)}</div>` : ''}
      </div>`
        )
        .join('');

      // 未归入 spots / food 的补充记录（正文里有、行程数据里没有的条目）
      const extraCards = (d.extra || [])
        .map(
          (x) => `<div class="rt-card">
        <div class="rt-card-head"><h4 class="rt-card-name">${esc(x.name)}</h4></div>
        ${x.desc ? `<p class="rt-card-desc">${escBr(x.desc)}</p>` : ''}
        ${(x.photos || []).length ? `<div class="rt-shots">${shots(x.photos)}</div>` : ''}
      </div>`
        )
        .join('');

      return `<section class="rt-day${i === 0 ? ' is-on' : ''}" data-rt-panel="${i}">
      <div class="rt-head">
        <div class="rt-date">DAY ${esc(d.day)} · ${esc(d.date)}</div>
        <h3 class="rt-label">${esc(d.label || d.route)}</h3>
        <div class="rt-meta">
          <em>${esc(d.route)}</em>
          ${d.distance ? `<span>${esc(d.distance)}</span>` : ''}
          ${d.duration ? `<span>${esc(d.duration)}</span>` : ''}
        </div>
        ${d.summary ? `<p class="rt-card-desc" style="margin-top:10px">${escBr(d.summary)}</p>` : ''}
        ${d.hotel ? `<div class="rt-hotel">住 <b>${esc(d.hotel)}</b></div>` : ''}
      </div>
      ${spotCards ? `<div class="rt-group"><div class="rt-group-title">景点</div>${spotCards}</div>` : ''}
      ${foodCards ? `<div class="rt-group"><div class="rt-group-title">吃了</div>${foodCards}</div>` : ''}
      ${extraCards ? `<div class="rt-group"><div class="rt-group-title">其他</div>${extraCards}</div>` : ''}
    </section>`;
    })
    .join('\n');

  // ---- 传给前端脚本的数据（只保留画图需要的字段）----
  const mapData = route.map((d) => ({
    day: d.day,
    date: d.date,
    label: d.label,
    route: d.route,
    marker: d.marker,
  }));

  return `
<div class="rt-fallback" id="rt-fallback" hidden>地图未能加载（可能是网络受限），下方行程文字与照片不受影响。</div>
<div class="rt-map" id="rt-map"></div>
<div class="rt-legend">
  <span><i class="rt-dot" style="background:#3a6a4a"></i>当日终点</span>
  <span><i class="rt-dot" style="background:#c08b3e"></i>起点</span>
  <span>共 ${route.length} 天 · ${route.reduce((s, d) => s + (d.spots || []).length, 0)} 个景点</span>
</div>
<nav class="rt-nav" id="rt-nav">${nav}</nav>
${panels}

<script id="rt-data" type="application/json">${JSON.stringify(mapData)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')}</script>
<script>
(function () {
  var days = JSON.parse(document.getElementById('rt-data').textContent);
  var nav = document.getElementById('rt-nav');
  var panels = document.querySelectorAll('[data-rt-panel]');

  // Day 切换
  nav.addEventListener('click', function (e) {
    var b = e.target.closest('[data-rt-day]');
    if (!b) return;
    var i = b.getAttribute('data-rt-day');
    nav.querySelectorAll('[data-rt-day]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
    panels.forEach(function (p) { p.classList.toggle('is-on', p.getAttribute('data-rt-panel') === i); });
  });

  // 地图（失败则降级）
  var fb = document.getElementById('rt-fallback');
  if (typeof L === 'undefined') { fb.hidden = false; return; }
  try {
    var map = L.map('rt-map', { scrollWheelZoom: false });
    // 高德路网瓦片：国内可达；CARTO / OSM 在本机实测不可达（被墙）
    L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
      subdomains: '1234',
      maxZoom: 18,
      attribution: '&copy; 高德地图',
    }).addTo(map);

    var pts = days.filter(function (d) { return Array.isArray(d.marker) && d.marker.length === 2; });
    if (!pts.length) { fb.hidden = false; return; }

    var latlngs = pts.map(function (d) { return d.marker; });
    L.polyline(latlngs, { color: '#3a6a4a', weight: 3, opacity: 0.75, dashArray: '6 5' }).addTo(map);
    pts.forEach(function (d, i) {
      var isStart = i === 0;
      L.marker(d.marker, {
        icon: L.divIcon({
          className: '',
          html: '<div style="width:14px;height:14px;border-radius:50%;background:' +
                (isStart ? '#c08b3e' : '#3a6a4a') +
                ';border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>',
          iconSize: [14, 14], iconAnchor: [7, 7],
        }),
      }).addTo(map).bindPopup('<b>Day ' + d.day + '</b> · ' + (d.label || '') + '<br>' + (d.route || ''));
    });
    map.fitBounds(L.latLngBounds(latlngs), { padding: [36, 36] });
  } catch (e) { fb.hidden = false; }
})();
</script>
`;
}

/**
 * 行程页需要的 <head> 资源（Leaflet 本地副本）。
 * 必须放在 <head> 里：leaflet.css 若在 body 中部才加载，地图会先按无样式渲染。
 * @param {string} base 资源路径前缀（'..'）
 */
function routeHead(base) {
  const prefix = base ? base + '/' : '';
  return (
    `<link rel="stylesheet" href="${prefix}vendor/leaflet/leaflet.css">` +
    `<script src="${prefix}vendor/leaflet/leaflet.js"></script>`
  );
}

module.exports = { ROUTE_CSS, renderRoutePage, routeHead };
