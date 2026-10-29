// موقع Meta Origin على GitHub Pages (metaorigineg.github.io): صفحة الشركة + صفحة تحميل لكل برنامج (نفس تصميم صفحة الصيدليات الأصلية).
// المصدر كله في programs.json (البرامج والروابط والفريق). البناء: node build.mjs ← index.html + <slug>/index.html
// برنامج من غير روابط تحميل بيظهر «قريبًا» وزرار واتساب «اطلب البرنامج».
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const D = JSON.parse(fs.readFileSync(path.join(HERE, 'programs.json'), 'utf8'));
const SHOTS = JSON.parse(fs.readFileSync(path.join(HERE, 'shots.json'), 'utf8'));
// الإصدارات والتحميل المباشر من GitHub Releases (collect-releases.mjs) — الزرار بيظهر بس بعد ما الملف يترفع (published)
const REL = fs.existsSync(path.join(HERE, 'releases.json')) ? JSON.parse(fs.readFileSync(path.join(HERE, 'releases.json'), 'utf8')) : {};
const RELEASE_REPO = 'metaorigineg/metaorigineg.github.io';
const directUrl = (r) => `https://github.com/${RELEASE_REPO}/releases/download/${r.tag}/${r.asset}`;
const fmtDay = (d) => { const [y, m, dd] = d.split('-'); return `${Number(dd)}/${Number(m)}/${y}`; };
const SITE = 'https://metaorigineg.github.io/';

// فيديوهات الشرح: من قناة اليوتيوب نفسها (آخر الفيديوهات) — أي فيديو عنوانه فيه «Meta Origin - <البرنامج>» و«الشرح الكامل» بيتربط بصفحة البرنامج
// لوحده. اللي مالوش فيديو لسه بيروح على القناة. لو مفيش نت وقت البناء: آخر روابط اتحفظت في videos.json.
const CHANNEL_ID = 'UC3KHIkXcJqMmrjqbYZbK0Aw';
const VIDEOS_FILE = path.join(HERE, 'videos.json');
let VIDEOS = {};
try { VIDEOS = JSON.parse(fs.readFileSync(VIDEOS_FILE, 'utf8')); } catch { /* أول مرة */ }
try {
  const xml = await (await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`)).text();
  const byLength = [...D.programs].sort((a, b) => b.product.length - a.product.length);
  const fresh = new Set(); // الفيد بيبدأ بالأحدث: أحدث فيديو للبرنامج بيكسب (لو اتمسح فيديو واترفع غيره)
  for (const [, id, title] of xml.matchAll(/<yt:videoId>(.*?)<\/yt:videoId>[\s\S]*?<title>(.*?)<\/title>/g)) {
    const p = byLength.find((x) => title.includes(x.product));
    if (p && /الشرح الكامل/.test(title) && !fresh.has(p.slug)) { VIDEOS[p.slug] = `https://youtu.be/${id}`; fresh.add(p.slug); }
  }
  fs.writeFileSync(VIDEOS_FILE, JSON.stringify(VIDEOS, null, 2) + '\n');
} catch (e) { console.log('مقدرتش أجيب فيديوهات القناة (هستخدم المحفوظ):', e.message); }
for (const p of D.programs) if (!p.video && VIDEOS[p.slug]) p.video = VIDEOS[p.slug];

// أسئلة خاصة بكل برنامج (faq.json: {slug: {ar: [[س, ج]], en: [...]}}) — بتتعرض قبل الأسئلة العامة
const PFAQ = JSON.parse(fs.readFileSync(path.join(HERE, 'faq.json'), 'utf8'));

// سجل الإصدارات (صفحة «آخر التحديثات»): كل إصدار وملاحظاته من tools/shared/whats-new/whats-new.js (+ changelog.py بتاع HR)،
// بيتحفظ في updates.json عشان البناء يشتغل حتى لو الفولدرات دي مش موجودة.
const WN_KEY = { pharmacy: 'pharmacy', 'sales-erp': 'saleserp', clinic: 'clinic', school: 'school', erp: 'erp', acc: 'acc', 'acc-new': 'accnew', stores: 'stores',
  hotel: 'hotel', 'hotel-pro': 'hotelpro', cashier: 'cashier', 'cashier-stores': 'kashier', 'cashier-lite': 'cashierlite', 'cashier-clothes': 'clothes',
  restaurant: 'restaurant', hr: 'hr', 'hr-pro': 'hrpro', 'hr-enterprise': 'hrenterprise' };
const UPDATES_FILE = path.join(HERE, 'updates.json');
let UPDATES = {};
try { UPDATES = JSON.parse(fs.readFileSync(UPDATES_FILE, 'utf8')); } catch { /* أول مرة */ }
try {
  const vm = await import('node:vm');
  const src = fs.readFileSync(path.join(HERE, '..', 'tools', 'shared', 'whats-new', 'whats-new.js'), 'utf8').replace(/var NOTES = \{/, 'var NOTES = globalThis.__NOTES = {');
  const noop = () => null;
  const ctx = { console: { log: noop, warn: noop }, setTimeout: noop, localStorage: { getItem: noop, setItem: noop },
    document: { addEventListener: noop, querySelector: noop, readyState: 'loading', createElement: () => ({ style: {}, appendChild: noop, setAttribute: noop }), head: { appendChild: noop }, body: { appendChild: noop } } };
  ctx.globalThis = ctx; ctx.window = ctx;
  vm.runInNewContext(src, ctx);
  const N = ctx.__NOTES || {};
  const fresh = {};
  for (const [slug, key] of Object.entries(WN_KEY)) if (N[key]) fresh[slug] = JSON.parse(JSON.stringify(N[key]));
  for (const [slug, dir] of [['hr', 'Meta Origin - HR'], ['hr-enterprise', 'Meta Origin - HR SQL Server']]) {
    const f = path.join(HERE, '..', dir, 'services', 'changelog.py');
    if (!fs.existsSync(f)) continue;
    fresh[slug] = {};
    // أول مرة الإصدار يظهر = الأحدث (HR Enterprise فيه تاريخ HR القديم بنفس أرقام الإصدارات تحت) — زي البرنامج نفسه
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/\('(\d+\.\d+\.\d+)',[^\[]*\[([\s\S]*?)\]\),/g)) if (!(m[1] in fresh[slug])) fresh[slug][m[1]] = [...m[2].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((x) => x[1]);
  }
  if (Object.keys(fresh).length) { UPDATES = fresh; fs.writeFileSync(UPDATES_FILE, JSON.stringify(UPDATES, null, 1) + '\n'); }
} catch (e) { console.log('مقدرتش أقرا ملاحظات الإصدارات (هستخدم المحفوظ):', e.message); }
const vcmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (y[i] || 0) - (x[i] || 0); return 0; };

// عدد مرات التحميل من GitHub Releases (كل إصدارات البرنامج مع بعض) — بيتحفظ في downloads.json لو مفيش نت
const DL_FILE = path.join(HERE, 'downloads.json');
let DLS = {};
try { DLS = JSON.parse(fs.readFileSync(DL_FILE, 'utf8')); } catch { /* أول مرة */ }
try {
  const fresh = {};
  for (let page = 1; page < 20; page++) {
    const r = await fetch(`https://api.github.com/repos/${RELEASE_REPO}/releases?per_page=100&page=${page}`, { headers: { 'User-Agent': 'MetaOrigin-Website', Accept: 'application/vnd.github+json' } });
    if (!r.ok) throw new Error('GitHub ' + r.status);
    const list = await r.json();
    for (const rel of list) {
      const slug = String(rel.tag_name).replace(/-v[\d.]+$/, '');
      fresh[slug] = (fresh[slug] || 0) + rel.assets.reduce((s, a) => s + (a.download_count || 0), 0);
    }
    if (list.length < 100) break;
  }
  DLS = fresh; fs.writeFileSync(DL_FILE, JSON.stringify(DLS, null, 2) + '\n');
} catch (e) { console.log('مقدرتش أجيب عدد التحميلات (هستخدم المحفوظ):', e.message); }
const DL_MIN = 10; // أقل من كده مابيظهرش (رقم صغير شكله وحش)
const fmtNum = (n) => n.toLocaleString('en-US');
// برامج مخفية مؤقتًا من الموقع ("hidden": true في programs.json): مالهاش كارت ولا صفحة ولا مكان في الخريطة (صفحتها القديمة بتتمسح)
for (const p of D.programs.filter((x) => x.hidden)) fs.rmSync(path.join(HERE, p.slug), { recursive: true, force: true });
D.programs = D.programs.filter((p) => !p.hidden);
const YEAR = new Date().getFullYear();
// اللغتين: العربي في الجذر والإنجليزي تحت /en/ (نفس الصفحات). النصوص الإنجليزي للبرامج والشركة في programs.en.json
const EN = JSON.parse(fs.readFileSync(path.join(HERE, 'programs.en.json'), 'utf8'));
let LANG = 'ar';
const L = (ar, en) => (LANG === 'en' ? en : ar);
const enP = (p) => (LANG === 'en' && EN.programs[p.slug]) || {};
const pName = (p) => (LANG === 'en' ? enP(p).name || p.nameAr : p.nameAr);
const pField = (p, k) => (LANG === 'en' && enP(p)[k] != null ? enP(p)[k] : p[k]);
const pFeatures = (p) => p.features.map((f, i) => (LANG === 'en' && enP(p).features?.[i] ? { ...f, ...enP(p).features[i] } : f));
const badge = (t) => (LANG === 'en' && t ? EN.badges[t] || t : t);
const company = (k) => (LANG === 'en' && EN.company[k] != null ? EN.company[k] : D.company[k]);
// رابط نفس الصفحة باللغة التانية (base = الطريق لجذر الموقع)
const otherLang = (base, sub = '') => (LANG === 'ar' ? `${base}en/${sub}` : `${base}${sub}`);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const wa = (n, text) => `https://wa.me/2${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
const rgb = (hex) => { const h = hex.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(','); };
// لون الكلام فوق لون البرنامج (حد الإضاءة 0.18 زي باقي البرامج)
const onColor = (hex) => {
  const [r, g, b] = rgb(hex).split(',').map((v) => { v = v / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.18 ? '#0b0f19' : '#ffffff';
};

function head({ title, desc, accent, base, image, sub = '', ld = [], arOnly = false }) {
  const url = LANG === 'en' ? `${SITE}en/${sub}` : `${SITE}${sub}`;
  const img = SITE + image.replace(/^(?:\.\.\/)+|^\.\//, '');
  const wide = /img\/og\//.test(image); // صورة الدعاية العريضة 1200×630 (غير كده = أيقونة مربعة)
  return `<!DOCTYPE html>
<html lang="${LANG}" dir="${L('rtl', 'ltr')}" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}">
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Meta Origin">
    <meta property="og:locale" content="${L('ar_EG', 'en_US')}">
    <meta property="og:url" content="${url}">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(desc)}">
    <meta property="og:image" content="${esc(img)}">${wide ? `
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">` : ''}
    <meta name="twitter:card" content="${wide ? 'summary_large_image' : 'summary'}">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(desc)}">
    <meta name="twitter:image" content="${esc(img)}">
    <meta name="theme-color" content="#0b0f19">
    <link rel="icon" href="${base}img/company-logo.png">
${arOnly ? '' : `    <link rel="alternate" hreflang="ar" href="${SITE}${sub}">
    <link rel="alternate" hreflang="en" href="${SITE}en/${sub}">
    <link rel="alternate" hreflang="x-default" href="${SITE}${sub}">`}${ld.map((x) => `
    <script type="application/ld+json">${JSON.stringify(x).replace(/</g, '\\u003c')}</script>`).join('')}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="${base}assets/site.css?v=__CSSV__">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        :root { --acc: ${accent}; --acc-rgb: ${rgb(accent)}; --on-acc: ${onColor(accent)}; }
        body { font-family: 'Cairo', sans-serif; background-color: #0b0f19; color: #f3f4f6; }
        .acc { color: var(--acc); } .bg-acc { background: var(--acc); color: var(--on-acc); } .bg-acc:hover { filter: brightness(1.1); }
        .bg-acc-soft { background: rgba(var(--acc-rgb), .12); color: var(--acc); } .border-acc { border-color: rgba(var(--acc-rgb), .45); }
        .glow-effect { box-shadow: 0 0 35px -5px rgba(var(--acc-rgb), .3); }
        .card-hover { transition: all .3s cubic-bezier(.4, 0, .2, 1); }
        .card-hover:hover { transform: translateY(-4px); border-color: var(--acc); box-shadow: 0 10px 25px -5px rgba(var(--acc-rgb), .18); }
        .ring-grad { background: linear-gradient(135deg, var(--acc), #2563eb 60%, rgba(var(--acc-rgb), .6)); }
        .zoom { position: fixed; inset: 0; background: rgba(0,0,0,.85); display: none; align-items: center; justify-content: center; z-index: 60; padding: 20px; }
        .zoom.on { display: flex; flex-direction: column; gap: 10px; } .zoom img { max-width: min(92vw, 640px); max-height: 90vh; border-radius: 18px; }
        .zoom.big { padding: 8px; } .zoom.big img { max-width: 98vw; max-height: calc(100vh - 60px); border-radius: 10px; box-shadow: 0 10px 40px rgba(0,0,0,.6); }
        .zoom a { color: #e5e7eb; font-size: 13px; font-weight: 700; background: rgba(255,255,255,.12); padding: 6px 14px; border-radius: 999px; display: none; } .zoom.big a { display: inline-block; }
        .video-wide { width: min(1280px, calc(100vw - 32px)); margin-inline: calc((100% - min(1280px, calc(100vw - 32px))) / 2); }
        .pick-on { background: var(--acc) !important; color: var(--on-acc) !important; border-color: var(--acc) !important; }
        .prog-card { --c: #3b82f6; } .prog-card:hover { border-color: var(--c); box-shadow: 0 10px 25px -8px color-mix(in srgb, var(--c) 40%, transparent); }
    </style>
</head>
<body class="min-h-screen flex flex-col justify-between">
    <div class="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 blur-3xl -z-10 pointer-events-none" style="background: linear-gradient(to bottom, rgba(var(--acc-rgb), .12), rgba(59,130,246,.05), transparent)"></div>`;
}

function header(base, { back, sub = '' } = {}) {
  return `
    <header class="w-full border-b border-gray-800/60 bg-darkbg/80 backdrop-blur-md sticky top-0 z-50">
        <div class="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center gap-3">
            <a href="${LANG === 'en' ? base + 'en/' : base}" class="flex items-center gap-3">
                <img src="${base}img/company-logo.png" alt="Meta Origin" class="w-10 h-10 object-cover rounded-xl bg-gray-900 border border-gray-800 p-0.5">
                <div>
                    <span class="font-black text-lg md:text-xl tracking-wide bg-gradient-to-l from-white via-gray-200 to-gray-400 bg-clip-text text-transparent block leading-tight">Meta Origin</span>
                    <span class="text-[10px] text-gray-400 font-semibold block">${L('إدارة الأنظمة والبرمجيات', 'Business software')}</span>
                </div>
            </a>
            <div class="flex items-center gap-2">
                <a href="${LANG === 'en' ? base + 'en/' : base}compare/" class="hidden xl:flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 text-sm font-bold"><i class="fa-solid fa-scale-balanced acc"></i>${L('مقارنة البرامج', 'Compare')}</a>
                ${LANG === 'ar' ? `<a href="${base}articles/" class="hidden xl:flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 text-sm font-bold"><i class="fa-solid fa-newspaper acc"></i>مقالات</a>` : ''}
                <a href="${LANG === 'en' ? base + 'en/' : base}updates/" class="hidden lg:flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 text-sm font-bold"><i class="fa-solid fa-bolt acc"></i>${L('آخر التحديثات', 'Updates')}</a>
                ${back ? `<a href="${LANG === 'en' ? base + 'en/' : base}#programs" class="hidden sm:flex items-center gap-2 bg-gray-800/60 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition border border-gray-700"><i class="fa-solid fa-grip acc"></i><span>${L('كل البرامج', 'All programs')}</span></a>` : `<a href="#programs" class="hidden sm:flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 text-sm font-bold">${L('البرامج', 'Programs')}</a><a href="#why" class="hidden md:flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 text-sm font-bold">${L('المميزات', 'Features')}</a><a href="#team" class="hidden sm:flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 text-sm font-bold">${L('تواصل معنا', 'Contact')}</a>`}
                <a href="${otherLang(base, sub)}" hreflang="${L('en', 'ar')}" lang="${L('en', 'ar')}" title="${L('English version', 'النسخة العربي')}" class="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700 text-gray-200 px-3 py-2 rounded-xl text-xs md:text-sm font-bold transition border border-gray-700"><i class="fa-solid fa-language acc"></i><span>${L('English', 'عربي')}</span></a>
                <button onclick="sharePage()" class="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition border border-gray-700 active:scale-95">
                    <i class="fa-solid fa-share-nodes acc"></i><span class="hidden sm:inline">${L('مشاركة الصفحة', 'Share')}</span>
                </button>
            </div>
        </div>
    </header>`;
}

function team(base, { title = L('فريق العمل وطرق التواصل', 'Our team & contact') } = {}) {
  return `
        <section id="team" class="space-y-6 pt-4">
            <div class="text-center space-y-2">
                <h2 class="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-2"><i class="fa-solid fa-users acc"></i><span>${title}</span></h2>
                <p class="text-gray-400 text-xs md:text-sm">${L('تواصل معنا مباشرة للدعم الفني والاستفسارات والتركيب', 'Contact us directly for support, questions and installation')}</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
${D.team.map((m, i) => `                <div class="bg-cardbg border border-gray-800 rounded-2xl p-6 space-y-4 card-hover">
                    <div class="flex items-center gap-4 border-b border-gray-800 pb-4">
                        <img src="${base}${m.photo}" alt="${esc(m.name)}" title="${L('اضغط لعرض الكارت كامل', 'Click to view the full card')}" onclick="zoomImg('${base}${m.card}')" class="w-16 h-16 rounded-full object-cover border-2 shadow-lg flex-shrink-0 cursor-zoom-in" style="border-color:${i ? '#38bdf8' : 'var(--acc)'}">
                        <div>
                            <span class="text-xs font-bold block mb-1" style="color:${i ? '#38bdf8' : 'var(--acc)'}">${esc(LANG === 'en' ? EN.team[i]?.role || m.role : m.role)}</span>
                            <h3 class="text-lg font-extrabold text-white">${esc(LANG === 'en' ? m.name : m.nameAr)}</h3>
                            <span class="text-[11px] text-gray-400">${esc(LANG === 'en' ? m.nameAr : m.name)}</span>
                        </div>
                    </div>
                    <p class="text-gray-300 text-xs leading-relaxed">${esc(LANG === 'en' ? EN.team[i]?.bio || m.bio : m.bio)}</p>
                    <div class="space-y-2 pt-2">
                        <div class="text-xs font-bold text-gray-200 flex items-center gap-1.5 mb-2"><i class="fa-solid fa-headset text-sky-400"></i> ${L('للتواصل والواتساب:', 'Call or WhatsApp:')}</div>
${m.phones.map((p) => `                        <div class="flex items-center justify-between bg-darkbg border ${p.main ? 'border-acc' : 'border-gray-800'} p-2.5 rounded-xl" ${p.main ? 'style="background:rgba(var(--acc-rgb),.05)"' : ''}>
                            <span class="font-mono font-bold text-sm ${p.main ? 'text-white' : 'text-gray-300'}" dir="ltr">${p.n}</span>
                            <a href="${wa(p.n)}" target="_blank" rel="noopener noreferrer" class="${p.main ? 'bg-acc' : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700'} px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                                <i class="fa-brands fa-whatsapp text-sm ${p.main ? '' : 'acc'}"></i> ${L('واتساب', 'WhatsApp')}${p.main ? L(' (الأساسي)', ' (main)') : ''}
                            </a>
                        </div>`).join('\n')}
                    </div>
                </div>`).join('\n')}
            </div>
            <div class="bg-cardbg border border-gray-800 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
${D.company.emails.map((e) => `                <a href="mailto:${esc(e)}" class="bg-darkbg border border-gray-800 hover:border-gray-600 p-3 rounded-xl flex items-center gap-2 font-bold text-gray-200 min-w-0"><i class="fa-solid fa-envelope acc"></i><span class="truncate" dir="ltr">${esc(e)}</span></a>`).join('\n')}
                <a href="${esc(D.company.instagram)}" target="_blank" rel="noopener noreferrer" class="bg-darkbg border border-gray-800 hover:border-gray-600 p-3 rounded-xl flex items-center gap-2 font-bold text-gray-200"><i class="fa-brands fa-instagram text-pink-500"></i> ${L('انستجرام', 'Instagram')}</a>
                <a href="${esc(D.company.facebook)}" target="_blank" rel="noopener noreferrer" class="bg-darkbg border border-gray-800 hover:border-gray-600 p-3 rounded-xl flex items-center gap-2 font-bold text-gray-200"><i class="fa-brands fa-facebook text-[#1877f2]"></i> ${L('فيسبوك', 'Facebook')}</a>
            </div>
        </section>`;
}

function footer(base, name) {
  return `
    <div id="toast" class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white border px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 transition-all duration-300 opacity-0 pointer-events-none translate-y-4 z-50" style="border-color:rgba(var(--acc-rgb),.5)">
        <i class="fa-solid fa-circle-check acc text-lg"></i><span id="toastMessage" class="text-xs md:text-sm font-bold">${L('تم النسخ بنجاح!', 'Copied!')}</span>
    </div>
    <div id="zoom" class="zoom" onclick="this.classList.remove('on')"><img id="zoomImg" alt=""><a id="zoomFull" href="#" target="_blank" rel="noopener" onclick="event.stopPropagation()">${L('افتح الصورة بحجمها الكامل', 'Open full size')}</a></div>
    <a href="${wa(D.company.whatsapp, name === 'Meta Origin' ? L('عايز أعرف أكتر عن برامج Meta Origin', 'I would like to know more about Meta Origin programs') : L(`عندي سؤال عن ${name}`, `I have a question about ${name}`))}" target="_blank" rel="noopener noreferrer" title="${L('كلّمنا واتساب', 'Chat on WhatsApp')}" class="fixed bottom-5 ${L('left-5', 'right-5')} z-40 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center text-3xl shadow-2xl active:scale-95"><i class="fa-brands fa-whatsapp"></i></a>
    <footer class="border-t border-gray-800/60 bg-darkbg py-8 mt-12">
        <div class="max-w-5xl mx-auto px-4 text-center space-y-3 text-gray-500 text-xs">
            <div class="flex items-center justify-center gap-2 mb-2">
                <img src="${base}img/company-logo.png" alt="Meta Origin" class="w-6 h-6 object-cover opacity-70 rounded-lg">
                <span class="font-bold text-gray-400">Meta Origin Software</span>
            </div>
            <div class="flex justify-center gap-4 text-base">
                <a href="${esc(D.company.facebook)}" target="_blank" rel="noopener noreferrer" class="hover:text-[#1877f2]" title="${L('فيسبوك', 'Facebook')}"><i class="fa-brands fa-facebook"></i> ${L('فيسبوك', 'Facebook')}</a>
                <a href="${esc(D.company.youtube)}" target="_blank" rel="noopener noreferrer" class="hover:text-red-500" title="${L('يوتيوب', 'YouTube')}"><i class="fa-brands fa-youtube"></i> ${L('يوتيوب', 'YouTube')}</a>
                <a href="${esc(D.company.instagram)}" target="_blank" rel="noopener noreferrer" class="hover:text-pink-500" title="${L('انستجرام', 'Instagram')}"><i class="fa-brands fa-instagram"></i> ${L('انستجرام', 'Instagram')}</a>
                <a href="${wa(D.company.whatsapp)}" target="_blank" rel="noopener noreferrer" class="hover:text-emerald-400" title="${L('واتساب', 'WhatsApp')}"><i class="fa-brands fa-whatsapp"></i> ${L('واتساب', 'WhatsApp')}</a>
            </div>
            <div class="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm" dir="ltr">
                ${D.company.emails.map((e) => `<a href="mailto:${esc(e)}" class="hover:text-white flex items-center gap-1.5"><i class="fa-solid fa-envelope"></i> ${esc(e)}</a>`).join("")}
            </div>
            <p><a href="${LANG === 'en' ? base + 'en/' : base}updates/" class="hover:text-white underline">${L('آخر التحديثات', 'Latest updates')}</a> · <a href="${LANG === 'en' ? base + 'en/' : base}compare/" class="hover:text-white underline">${L('مقارنة البرامج', 'Compare programs')}</a> · ${LANG === 'ar' ? `<a href="${base}articles/" class="hover:text-white underline">مقالات ونصايح</a> · ` : ''}<a href="${base}privacy/" class="hover:text-white underline">${L('سياسة الخصوصية · Privacy Policy', 'Privacy Policy · سياسة الخصوصية')}</a></p>
            <p>${L('جميع الحقوق محفوظة', 'All rights reserved')} &copy; ${YEAR} - ${esc(name)}</p>
        </div>
    </footer>
    <script>
        function copyTextToClipboard(text, msg) {
            (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).catch(() => { const t = document.createElement('input'); document.body.appendChild(t); t.value = text; t.select(); document.execCommand('copy'); t.remove(); });
            showToast(msg);
        }
        function copyPassword(p) { copyTextToClipboard(p, ${L(`'تم نسخ كلمة السر (' + p + ') بنجاح!'`, `'Password (' + p + ') copied!'`)}); }
        function copyPageLink() { copyTextToClipboard(location.href, ${L(`'تم نسخ رابط الصفحة بنجاح!'`, `'Page link copied!'`)}); }
        function sharePage() { if (navigator.share) navigator.share({ title: document.title, url: location.href }).catch(() => {}); else copyPageLink(); }
        function showToast(m) {
            const t = document.getElementById('toast'); document.getElementById('toastMessage').textContent = m;
            t.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4'); t.classList.add('opacity-100', 'translate-y-0');
            setTimeout(() => { t.classList.remove('opacity-100', 'translate-y-0'); t.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4'); }, 3000);
        }
${requestJs()}
        function pickBiz(i, btn) {
            document.querySelectorAll('[data-pick]').forEach((el) => { el.style.display = el.dataset.pick === String(i) ? '' : 'none'; });
            document.querySelectorAll('[data-pick-btn]').forEach((b) => b.classList.toggle('pick-on', b === btn));
            const r = document.getElementById('pickResult'); if (r && r.getBoundingClientRect().top > innerHeight - 120) r.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        function zoomImg(src, big) { document.getElementById('zoomImg').src = src; document.getElementById('zoomFull').href = src; const z = document.getElementById('zoom'); z.classList.toggle('big', !!big); z.classList.add('on'); }
        function filterPrograms(q) {
            q = q.trim(); let shown = 0;
            document.querySelectorAll('[data-prog]').forEach((el) => { const ok = !q || el.dataset.prog.includes(q); el.style.display = ok ? '' : 'none'; if (ok) shown++; });
            document.querySelectorAll('[data-cat]').forEach((sec) => { sec.style.display = [...sec.querySelectorAll('[data-prog]')].some((e) => e.style.display !== 'none') ? '' : 'none'; });
            const n = document.getElementById('noResult'); if (n) n.style.display = shown ? 'none' : '';
        }
    </script>
</body>
</html>
`;
}

// ---------------- صفحة البرنامج ----------------
function gallery(p, base) {
  const list = SHOTS[p.slug] || [];
  if (!list.length) return '';
  return `
        <section id="screens" class="space-y-6">
            <div class="text-center space-y-2">
                <h2 class="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-2"><i class="fa-solid fa-images acc"></i><span>${L('صور من البرنامج', 'Screenshots')}</span></h2>
                <p class="text-gray-400 text-xs md:text-sm">${L('اضغط على أي صورة عشان تكبّرها', 'Click any image to enlarge it')}</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
${list.map((x, i) => (LANG === 'en' && enP(p).shots?.[i] ? { ...x, t: enP(p).shots[i] } : x)).map((x) => `                <figure class="bg-cardbg border border-gray-800 rounded-2xl overflow-hidden card-hover cursor-zoom-in" onclick="zoomImg('${base}${x.f}', true)">
                    <img src="${base}${x.f}" alt="${esc(x.t)}" loading="lazy" decoding="async" class="w-full aspect-[16/10] object-cover object-top">
                    <figcaption class="px-4 py-2.5 text-sm font-bold text-gray-200">${esc(x.t)}</figcaption>
                </figure>`).join('\n')}
            </div>
        </section>`;
}

const FAQ_AR = [
  ['البرنامج مجاني؟', 'بتجربه 14 يوم كاملين بكل الشاشات، وبعدها محتاج ترخيص — كلّمنا على الواتساب وهنقولك الأسعار المناسبة لنشاطك.'],
  ['ينفع يشتغل على أكتر من جهاز؟', 'أيوه: جهاز رئيسي عليه البيانات وأجهزة تانية على نفس الشبكة، وكتير من البرامج بتتفتح كمان من المتصفح والموبايل.'],
  ['بياناتي في أمان؟', 'البيانات على جهازك أنت، ومعاها نسخ احتياطي تلقائي في مكانين (ونسخة متشفّرة على Google Drive أو OneDrive لو حبيت)، وصلاحيات لكل موظف وسجل لكل عملية.'],
  ['البرنامج بالإنجليزي كمان؟', 'أيوه، البرنامج بيشتغل بالعربي والإنجليزي وتقدر تبدّل بينهم.'],
  ['لو حصلت مشكلة؟', 'جوّه البرنامج فيه زرار «إرسال تقرير مشكلة»، أو كلّمنا على الواتساب مباشرة وهنساعدك.'],
];
const FAQ_EN = [
  ['Is the program free?', 'You get a full 14-day trial with every screen; after that you need a license — message us on WhatsApp for prices that fit your business.'],
  ['Does it work on more than one PC?', 'Yes: a main PC holds the data and other devices connect on the same network, and many programs also open from the browser and the phone.'],
  ['Is my data safe?', 'Your data stays on your own computer, with automatic backups in two places (and encrypted backups to Google Drive or OneDrive), permissions for every employee and a log of every action.'],
  ['Is the program in English too?', 'Yes, the programs work in Arabic and English and you can switch between them.'],
  ['What if something goes wrong?', 'Inside the program there is a «Send problem report» button, or message us directly on WhatsApp and we will help.'],
];
/** أسئلة البرنامج نفسه الأول وبعدين العامة (نفس القايمة بتروح لجوجل في FAQPage) */
const faqList = (p) => [...((PFAQ[p.slug] || {})[LANG] || []), ...(LANG === 'en' ? FAQ_EN : FAQ_AR)];
function installAndFaq(p) {
  const FAQ = faqList(p);
  const steps = LANG === 'en' ? [
    'Download the program from «Direct download» or any server above and extract it (it is a RAR file — open it with WinRAR or 7-Zip).',
    'If Windows shows «Windows protected your PC», click More info → Run anyway (this is normal for any new program not from the Microsoft Store).',
    `Run «${p.product} Setup.exe» and choose: the main PC (the one that holds the data) or another device on the network.`,
    'Choose «14-day trial» or enter your license — the machine code appears in the setup wizard if you want to activate.',
    'Open the program, sign in, and start from the detailed guide inside it — or contact us and we will help.',
  ] : [
    'حمّل البرنامج من «التحميل المباشر» أو أي سيرفر فوق، وفك الضغط (الملف RAR — بيتفتح بـ WinRAR أو 7-Zip).',
    'لو ويندوز طلّع رسالة «Windows protected your PC»: اضغط More info ← Run anyway (دي رسالة عادية لأي برنامج جديد مش من متجر مايكروسوفت).',
    `شغّل «${p.product} Setup.exe» واختار: الجهاز الرئيسي (اللي عليه البيانات) أو جهاز تاني على الشبكة.`,
    'اختار «تجربة 14 يوم» أو اكتب الترخيص — وكود الجهاز بيظهر في المعالج لو عايز تفعّل.',
    'افتح البرنامج وادخل، وابدأ من الشرح التفصيلي اللي جوّاه أو كلّمنا ونساعدك.',
  ];
  const req = LANG === 'en' ? [
    ['fa-brands fa-windows', 'Windows 10 or 11 (64-bit)'],
    ['fa-solid fa-memory', '4 GB RAM or more (8 GB for the main PC on a large network)'],
    ['fa-solid fa-hard-drive', 'At least 1 GB of free disk space'],
    ['fa-solid fa-wifi', 'Network: devices on the same router/network as the main PC'],
    ['fa-solid fa-print', 'Works with thermal and A4 invoice printers and barcode readers'],
  ] : [
    ['fa-brands fa-windows', 'Windows 10 أو 11 (64-bit)'],
    ['fa-solid fa-memory', 'رامات 4 جيجا أو أكتر (8 للجهاز الرئيسي على شبكة كبيرة)'],
    ['fa-solid fa-hard-drive', 'مساحة فاضية 1 جيجا على الأقل'],
    ['fa-solid fa-wifi', 'الشبكة: الأجهزة على نفس الراوتر/الشبكة بتاعة الجهاز الرئيسي'],
    ['fa-solid fa-print', 'بيشتغل مع طابعات الفواتير الحرارية و A4 وقارئ الباركود'],
  ];
  return `
        <section class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-cardbg border border-gray-800 rounded-2xl p-6 space-y-4">
                <h2 class="text-xl font-bold text-white flex items-center gap-2"><i class="fa-solid fa-list-ol acc"></i> ${L('خطوات التسطيب', 'Installation steps')}</h2>
                <ol class="space-y-3 text-sm text-gray-300">
${steps.map((t, i) => `                    <li class="flex gap-3"><span class="w-7 h-7 rounded-full bg-acc flex items-center justify-center text-xs font-black flex-shrink-0">${i + 1}</span><span class="pt-0.5">${esc(t)}</span></li>`).join('\n')}
                </ol>
            </div>
            <div class="bg-cardbg border border-gray-800 rounded-2xl p-6 space-y-4">
                <h2 class="text-xl font-bold text-white flex items-center gap-2"><i class="fa-solid fa-microchip acc"></i> ${L('متطلبات التشغيل', 'System requirements')}</h2>
                <ul class="space-y-2.5 text-sm text-gray-300">
${req.map(([ic, t]) => `                    <li class="flex gap-2"><i class="${ic} acc mt-1"></i> ${esc(t)}</li>`).join('\n')}
                </ul>
            </div>
        </section>

        <section id="faq" class="space-y-4">
            <h2 class="text-2xl font-bold text-white text-center flex items-center justify-center gap-2"><i class="fa-solid fa-circle-question acc"></i> ${L('أسئلة متكررة', 'FAQ')}</h2>
            <div class="space-y-3 max-w-3xl mx-auto">
${FAQ.map(([q, a]) => `                <details class="bg-cardbg border border-gray-800 rounded-xl p-4 group"><summary class="font-bold text-white cursor-pointer list-none flex justify-between items-center">${esc(q)}<i class="fa-solid fa-chevron-down acc text-xs transition group-open:rotate-180"></i></summary><p class="text-gray-400 text-sm mt-3 leading-relaxed">${esc(a)}</p></details>`).join('\n')}
            </div>
        </section>`;
}

function downloadCard(d, wide) {
  const color = d.tone || '#9ca3af';
  return `                <div class="bg-cardbg border ${d.password ? '' : 'border-gray-800'} rounded-2xl p-4 md:p-5 card-hover flex items-center justify-between gap-4${wide ? ' md:col-span-2' : ''}" ${d.password ? `style="border-color:${color}55"` : ''}>
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style="background:${color}1a;color:${color}"><i class="${d.icon}"></i></div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="font-bold text-white text-base md:text-lg">${esc(d.name)}</h3>
                                ${d.badge ? `<span class="text-[10px] md:text-xs px-2 py-0.5 rounded-full font-bold border" style="background:${color}1a;color:${color};border-color:${color}33">${esc(badge(d.badge))}</span>` : ''}
                            </div>
                            ${d.password ? `<div class="flex items-center gap-2 mt-1"><span class="text-xs text-gray-400">${L('الباسورد:', 'Password:')}</span>
                                <button onclick="copyPassword('${esc(d.password)}')" class="font-mono text-xs px-2 py-0.5 rounded border flex items-center gap-1 transition" style="background:${color}33;color:${color};border-color:${color}55"><strong>${esc(d.password)}</strong><i class="fa-regular fa-copy text-[10px]"></i></button></div>`
    : `<p class="text-xs text-gray-400 mt-1">${esc(badge(d.note || ''))}</p>`}
                        </div>
                    </div>
                    <a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer" class="${d.primary ? 'bg-acc' : d.password ? '' : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'} px-4 md:px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-2 flex-shrink-0 active:scale-95 shadow-md" ${d.password ? `style="background:${color};color:#111"` : ''}>
                        <span>${L('تحميل', 'Download')}</span><i class="fa-solid fa-download text-xs"></i>
                    </a>
                </div>`;
}

function programPage(p) {
  const base = L('../', '../../');
  const sub = `${p.slug}/`;
  const rel = REL[p.slug];
  if (rel && rel.published) {
    p = { ...p, downloads: [{ name: L('تحميل مباشر', 'Direct download'), icon: 'fa-brands fa-github', tone: p.color, badge: L('الرسمي والأسرع', 'Official & fastest'), note: L(`${rel.kind === 'RAR' ? 'ملف RAR' : 'ملف التسطيب'} — ${rel.sizeMB} ميجا · الإصدار ${rel.version}`, `${rel.kind === 'RAR' ? 'RAR file' : 'Installer'} — ${rel.sizeMB} MB · version ${rel.version}`), url: directUrl(rel), primary: true },
      ...(p.downloads || []).map((d) => ({ ...d, primary: false }))] };
  }
  const has = (p.downloads || []).length > 0;
  const ask = wa(D.company.whatsapp, L(`عايز برنامج ${p.product} (${p.nameAr})`, `I would like the program ${p.product}`));
  const grid = has ? `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
${p.downloads.map((d, i) => downloadCard(d) + (i === p.downloads.length - 1 && p.downloads.length % 2 ? '' : '')).join('\n')}
            </div>` : `
            <div class="bg-cardbg border border-acc rounded-3xl p-8 text-center space-y-4 glow-effect">
                <div class="w-16 h-16 mx-auto rounded-2xl bg-acc-soft flex items-center justify-center text-3xl"><i class="fa-solid fa-hourglass-half"></i></div>
                <h3 class="text-xl md:text-2xl font-extrabold text-white">${L('روابط التحميل قريبًا', 'Download links coming soon')}</h3>
                <p class="text-gray-400 text-sm max-w-xl mx-auto">${L('البرنامج جاهز ومتاح — اطلبه دلوقتي على الواتساب وهنبعتلك رابط التحميل ونساعدك في التركيب والتفعيل (14 يوم تجربة مجانية).', 'The program is ready — request it on WhatsApp and we will send you the download link and help with installation and activation (14-day free trial).')}</p>
                <a href="${ask}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 bg-acc px-6 py-3 rounded-xl font-extrabold shadow-lg active:scale-95"><i class="fa-brands fa-whatsapp text-lg"></i> ${L('اطلب البرنامج على الواتساب', 'Request it on WhatsApp')}</a>
            </div>`;
  const title = `${p.product} | ${L('مركز التحميل الرسمي', 'Official download')}`;
  const dl = DLS[p.slug] || 0;
  const pageUrl = LANG === 'en' ? `${SITE}en/${sub}` : `${SITE}${sub}`;
  // بيانات لجوجل: البرنامج نفسه + الأسئلة المتكررة
  const ld = [{
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: p.product, alternateName: pName(p), description: pField(p, 'about'),
    applicationCategory: 'BusinessApplication', applicationSubCategory: pField(p, 'category'), operatingSystem: 'Windows 10, Windows 11',
    url: pageUrl, image: `${SITE}icons/${p.slug}.png`, inLanguage: ['ar', 'en'],
    ...(rel ? { softwareVersion: rel.version, dateModified: rel.date, ...(rel.published ? { downloadUrl: directUrl(rel), fileSize: `${rel.sizeMB} MB` } : {}) } : {}),
    publisher: { '@type': 'Organization', name: 'Meta Origin', url: SITE },
  }, {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqList(p).map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  }];
  const ogImg = fs.existsSync(path.join(HERE, 'img', 'og', `${p.slug}.jpg`)) ? `${base}img/og/${p.slug}.jpg` : `${base}icons/${p.slug}.png`;
  return head({ title, desc: pField(p, 'about'), accent: p.color, base, image: ogImg, sub, ld }) + header(base, { back: true, sub }) + `
    <main class="max-w-5xl mx-auto px-4 py-10 w-full space-y-12">
        <section class="text-center space-y-6">
            <div class="relative inline-block">
                <div class="w-32 h-32 md:w-40 md:h-40 mx-auto rounded-3xl ring-grad p-1 shadow-2xl glow-effect">
                    <div class="w-full h-full bg-cardbg rounded-[22px] flex items-center justify-center overflow-hidden p-2">
                        <img src="${base}icons/${p.slug}.png" alt="${esc(p.product)}" class="w-full h-full object-cover rounded-2xl">
                    </div>
                </div>
                <span class="absolute -bottom-2 ${L('-right-2', '-left-2')} bg-acc text-xs font-black px-3 py-1 rounded-full border-2 border-darkbg flex items-center gap-1 shadow-lg"><i class="fa-solid fa-circle-check text-[10px]"></i> ${L('النُسخة الرسمية', 'Official version')}</span>
            </div>
            <div class="space-y-3">
                <h1 class="text-3xl md:text-5xl font-extrabold text-white tracking-wide" dir="ltr">${esc(p.product)}</h1>
                <p class="text-lg md:text-xl font-bold acc">${esc(pName(p))}</p>
                <p class="text-gray-300 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">${esc(pField(p, 'about'))}</p>
            </div>
            <div class="flex flex-wrap justify-center items-center gap-3 pt-2 text-xs md:text-sm text-gray-300">
                <div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid fa-desktop acc"></i><span>${L('النظام:', 'System:')} <strong class="text-white">Windows (64-bit)</strong></span></div>
                <div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid ${p.icon} acc"></i><span>${L('التصنيف:', 'Category:')} <strong class="text-white">${esc(pField(p, 'category'))}</strong></span></div>
                <div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid fa-certificate acc"></i><span>${L('<strong class="text-emerald-400">النسخة الرسمية</strong> من Meta Origin', '<strong class="text-emerald-400">Official version</strong> from Meta Origin')}</span></div>
                ${rel ? `<div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid fa-code-branch acc"></i><span>${L('الإصدار:', 'Version:')} <strong class="text-white" dir="ltr">${esc(rel.version)}</strong></span></div>
                <div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid fa-calendar-day acc"></i><span>${L('آخر تحديث:', 'Updated:')} <strong class="text-white">${fmtDay(rel.date)}</strong></span></div>` : ''}
                ${dl >= DL_MIN ? `<div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid fa-download acc"></i><span>${L('اتحمّل', 'Downloaded')} <strong class="text-white">${fmtNum(dl)}</strong> ${L('مرة', 'times')}</span></div>` : ''}
                <div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid fa-language acc"></i><span>${L('اللغة:', 'Language:')} <strong class="text-white">${L('عربي / English', 'English / عربي')}</strong></span></div>
                <div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid fa-gift acc"></i><span>${L('<strong class="text-white">14 يوم</strong> تجربة مجانية', '<strong class="text-white">14-day</strong> free trial')}</span></div>
            </div>
            <div class="flex flex-wrap justify-center gap-3">
                <a href="#downloads" class="inline-flex items-center gap-2 bg-acc px-6 py-3 rounded-xl font-extrabold shadow-lg active:scale-95"><i class="fa-solid fa-download"></i> ${L('تحميل البرنامج', 'Download')}</a>
                <a href="${esc(p.video || D.company.youtube)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-extrabold shadow-lg active:scale-95"><i class="fa-brands fa-youtube text-lg"></i> ${p.video ? L('شاهد فيديو الشرح', 'Watch the video guide') : L('فيديوهات الشرح على اليوتيوب', 'Video guides on YouTube')}</a>
            </div>
        </section>

        <section id="downloads" class="space-y-6">
            <div class="text-center space-y-2">
                <h2 class="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-2"><i class="fa-solid fa-cloud-arrow-down acc"></i><span>${has ? L('سيرفرات التحميل المتاحة', 'Download servers') : L('تحميل البرنامج', 'Download')}</span></h2>
                <p class="text-gray-400 text-xs md:text-sm">${has ? L('اختر المنصة أو السيرفر المفضل لديك لبدء التحميل المباشر', 'Pick any platform or server to start downloading') : L('تواصل معنا وهنوصلك البرنامج', 'Contact us and we will send you the program')}</p>
            </div>${grid}
            ${rel && rel.notes.length && LANG === 'ar' ? `<details class="bg-cardbg border border-gray-800 rounded-2xl p-5 group" open>
                <summary class="font-bold text-white cursor-pointer list-none flex justify-between items-center"><span><i class="fa-solid fa-wand-magic-sparkles acc"></i> إيه الجديد في الإصدار <span dir="ltr">${esc(rel.version)}</span></span><i class="fa-solid fa-chevron-down acc text-xs transition group-open:rotate-180"></i></summary>
                <ul class="mt-3 space-y-2 text-sm text-gray-300">${rel.notes.map((n) => `<li class="flex gap-2"><i class="fa-solid fa-check acc mt-1"></i><span>${esc(n)}</span></li>`).join('')}</ul>
                ${Object.keys(UPDATES[p.slug] || {}).length > 1 ? `<a href="${base}updates/#${p.slug}" class="inline-flex items-center gap-1.5 mt-4 text-sm font-bold acc hover:underline"><i class="fa-solid fa-clock-rotate-left"></i> كل الإصدارات اللي فاتت</a>` : ''}
            </details>` : ''}
            ${LANG === 'en' && Object.keys(UPDATES[p.slug] || {}).length ? `<p class="text-center text-sm"><a href="${base}en/updates/#${p.slug}" class="font-bold acc hover:underline"><i class="fa-solid fa-clock-rotate-left"></i> Release history${rel ? ` (latest: ${esc(rel.version)})` : ''}</a></p>` : ''}
        </section>

${compareLink(p, base)}
        <section class="space-y-8 pt-4">
            <div class="text-center space-y-2">
                <h2 class="text-2xl md:text-3xl font-bold text-white">${L(`لماذا <span dir="ltr">${esc(p.product)}</span>؟`, `Why ${esc(p.product)}?`)}</h2>
                <p class="text-gray-400 text-xs md:text-sm">${L('مميزات رئيسية تجعل شغلك أسهل وأكثر دقة', 'Key features that make your work easier and more accurate')}</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
${pFeatures(p).map((f, i) => `                <div class="bg-cardbg border border-gray-800 p-6 rounded-2xl space-y-3 border-t-2" style="border-top-color:${['var(--acc)', '#3b82f6', '#a855f7'][i % 3]}">
                    <div class="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold" style="background:${['rgba(var(--acc-rgb),.12)', 'rgba(59,130,246,.12)', 'rgba(168,85,247,.12)'][i % 3]};color:${['var(--acc)', '#60a5fa', '#c084fc'][i % 3]}"><i class="fa-solid ${f.icon}"></i></div>
                    <h3 class="text-lg font-bold text-white">${esc(f.t)}</h3>
                    <p class="text-gray-400 text-xs leading-relaxed">${esc(f.d)}</p>
                </div>`).join('\n')}
            </div>
        </section>
${p.video ? `
        <section id="video" class="space-y-6">
            <div class="text-center space-y-2">
                <h2 class="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-2"><i class="fa-brands fa-youtube text-red-500"></i><span>${L('فيديو الشرح', 'Video guide')}</span></h2>
                <p class="text-gray-400 text-xs md:text-sm">${L('شرح كامل للبرنامج بالعامية المصرية', 'A full walkthrough of the program (in Egyptian Arabic)')} — <a class="acc underline" href="${esc(D.company.youtube)}" target="_blank" rel="noopener noreferrer">${L('وفيديوهات تانية على القناة', 'more videos on our channel')}</a></p>
            </div>
            <div class="video-wide rounded-2xl overflow-hidden border border-gray-800 shadow-2xl aspect-video bg-black">
                <iframe class="w-full h-full" src="https://www.youtube-nocookie.com/embed/${esc(p.video.split('/').pop())}?rel=0&modestbranding=1&playsinline=1" title="${esc(p.product)}" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>
            </div>
            <p class="text-center text-xs text-gray-400">${L('لو الصورة مش واضحة: اختار <b>1080p</b> من ⚙️ في المشغّل، أو', 'If it looks blurry: pick <b>1080p</b> from ⚙️ in the player, or')} <a class="acc underline font-bold" href="${esc(p.video)}" target="_blank" rel="noopener noreferrer">${L('شاهده على يوتيوب بجودة عالية', 'watch it on YouTube in HD')}</a></p>
        </section>` : ''}
${gallery(p, base)}
${programArticles(p, base)}
${installAndFaq(p)}
${requestForm(base, p)}
${team(base)}

        <section class="bg-cardbg border border-gray-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl" style="background:linear-gradient(90deg, rgba(var(--acc-rgb),.12), #111827, rgba(37,99,235,.12))">
            <div class="space-y-2 text-center ${L('md:text-right', 'md:text-left')}">
                <h3 class="text-xl font-extrabold text-white">${L('مشاركة رابط التحميل', 'Share the download link')}</h3>
                <p class="text-gray-400 text-xs md:text-sm">${L('يمكنك نسخ رابط هذه الصفحة ومشاركته مع أي عميل فوراً.', 'Copy this page link and share it with anyone.')}</p>
            </div>
            <div class="flex items-center gap-3 w-full md:w-auto">
                <button onclick="copyPageLink()" class="w-full md:w-auto bg-acc font-extrabold px-6 py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg active:scale-95 text-sm"><i class="fa-regular fa-copy"></i><span>${L('نسخ رابط الصفحة', 'Copy page link')}</span></button>
                <a href="${LANG === 'en' ? base + 'en/' : base}#programs" class="w-full md:w-auto bg-gray-800 hover:bg-gray-700 text-white font-bold px-6 py-3 rounded-xl transition flex items-center justify-center gap-2 border border-gray-700 text-sm"><i class="fa-solid fa-grip"></i><span>${L('كل البرامج', 'All programs')}</span></a>
            </div>
        </section>
    </main>` + footer(base, p.product);
}

// ---------------- صفحة الشركة ----------------
function homePage() {
  const base = L('./', '../');
  const cats = Object.entries(D.categories).map(([id, name]) => ({ id, name: LANG === 'en' ? EN.categories[id] || name : name, items: D.programs.filter((p) => p.cat === id) })).filter((c) => c.items.length);
  const card = (p) => `                <a href="${p.slug}/" data-prog="${esc([p.product, p.nameAr, p.category, p.short, pName(p), pField(p, 'category'), pField(p, 'short')].join(' ').toLowerCase())}" class="prog-card bg-cardbg border border-gray-800 rounded-2xl p-5 flex gap-4 items-start transition hover:-translate-y-1" style="--c:${p.color}">
                    <img src="${base}icons/${p.slug}.png" alt="" class="w-16 h-16 rounded-2xl flex-shrink-0" loading="lazy">
                    <div class="min-w-0 space-y-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <h3 class="font-extrabold text-white text-base" dir="ltr">${esc(p.product.replace('Meta Origin - ', ''))}</h3>
                            ${p.isNew ? `<span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-400 text-black">${L('جديد', 'New')}</span>` : ''}
                            ${(p.downloads || []).length || REL[p.slug]?.published ? `<span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">${L('متاح للتحميل', 'Available')}</span>` : `<span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-700/50 text-gray-300 border border-gray-600">${L('قريبًا', 'Soon')}</span>`}
                        </div>
                        <div class="text-sm font-bold" style="color:${p.color}">${esc(pName(p))}</div>
                        <p class="text-xs text-gray-400 leading-relaxed">${esc(pField(p, 'short'))}</p>
                        ${(DLS[p.slug] || 0) >= DL_MIN ? `<p class="text-[11px] text-gray-500"><i class="fa-solid fa-download"></i> ${L('اتحمّل', 'Downloaded')} ${fmtNum(DLS[p.slug])} ${L('مرة', 'times')}</p>` : ''}
                    </div>
                </a>`;
  // «إيه البرنامج المناسب ليك؟» — نوع النشاط ← البرامج المناسبة (المخفية بتتشال لوحدها)
  const PICKER = [
    ['fa-prescription-bottle-medical', 'صيدلية', 'Pharmacy', ['pharmacy']],
    ['fa-stethoscope', 'عيادة أو مركز طبي', 'Clinic or medical center', ['clinic']],
    ['fa-school', 'مدرسة أو جامعة', 'School or university', ['school']],
    ['fa-cart-shopping', 'سوبر ماركت أو بقالة', 'Supermarket or grocery', ['cashier', 'cashier-lite']],
    ['fa-shirt', 'محل ملابس أو عطور أو موبايلات', 'Clothes, perfume or mobile shop', ['cashier-stores', 'cashier-clothes']],
    ['fa-store', 'محل صغير بجهاز واحد', 'Small shop with one PC', ['cashier-lite']],
    ['fa-utensils', 'مطعم أو كافيه أو دليفري', 'Restaurant, café or delivery', ['restaurant']],
    ['fa-hotel', 'فندق أو شقق أو سكن طلاب', 'Hotel, apartments or student housing', ['hotel-pro', 'hotel']],
    ['fa-industry', 'مصنع ملابس', 'Garment factory', ['erp', 'stores']],
    ['fa-truck', 'شركة تجارية أو توزيع (فروع ومخازن)', 'Trading or distribution company', ['sales-erp', 'acc-new']],
    ['fa-warehouse', 'مخازن وأوامر إنتاج', 'Warehouses & production orders', ['stores', 'acc-new']],
    ['fa-calculator', 'حسابات شركة', 'Company accounting', ['acc', 'acc-new']],
    ['fa-id-card', 'مرتبات وحضور وبصمة', 'Payroll, attendance & fingerprint', ['hr-pro', 'hr', 'hr-enterprise']],
  ].map(([ic, ar, en, slugs]) => ({ ic, t: L(ar, en), items: slugs.map((s) => D.programs.find((p) => p.slug === s)).filter(Boolean) })).filter((x) => x.items.length);
  const picker = `
        <section id="picker" class="space-y-6">
            <div class="text-center space-y-2">
                <h2 class="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-2"><i class="fa-solid fa-wand-magic-sparkles acc"></i><span>${L('إيه البرنامج المناسب ليك؟', 'Which program is right for you?')}</span></h2>
                <p class="text-gray-400 text-xs md:text-sm">${L('اختار نشاطك وإحنا نقولك تبدأ بإيه', 'Pick your business and we will tell you where to start')}</p>
            </div>
            <div class="flex flex-wrap justify-center gap-2">
${PICKER.map((x, i) => `                <button data-pick-btn onclick="pickBiz(${i}, this)" class="bg-cardbg border border-gray-700 hover:border-gray-500 text-gray-200 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition active:scale-95"><i class="fa-solid ${x.ic}"></i>${esc(x.t)}</button>`).join('\n')}
            </div>
            <div id="pickResult">
${PICKER.map((x, i) => `                <div data-pick="${i}" style="display:none" class="space-y-3">
                    <p class="text-center text-sm text-gray-300">${x.items.length > 1 ? L(`قدامك ${x.items.length === 2 ? 'اختيارين' : `<strong class="text-white">${x.items.length}</strong> اختيارات`} — الأول هو الأنسب لأغلب الناس:`, `<strong class="text-white">${x.items.length}</strong> options — the first one fits most people:`) : L('البرنامج المناسب ليك:', 'The right program for you:')}</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
${x.items.map((p) => card(p).replace(/ data-prog="[^"]*"/, '')).join('\n')}
                    </div>
                </div>`).join('\n')}
                <p class="text-center text-sm pt-3"><a href="${homeOf(base)}compare/" class="font-bold acc hover:underline"><i class="fa-solid fa-scale-balanced"></i> ${L('محتار بين برنامجين؟ شوف المقارنة بينهم', 'Torn between two programs? See the comparison')}</a></p>
                <p class="text-center text-xs text-gray-500 pt-1">${L('مش لاقي نشاطك؟', 'Not sure?')} <a class="acc underline" href="${wa(D.company.whatsapp, L('محتاج برنامج لنشاطي', 'I need a program for my business'))}" target="_blank" rel="noopener noreferrer">${L('كلّمنا واتساب وهنقولك المناسب', 'WhatsApp us and we will advise you')}</a></p>
            </div>
        </section>`;
  const totalDl = Object.entries(DLS).filter(([s]) => D.programs.some((p) => p.slug === s)).reduce((a, [, n]) => a + n, 0);
  const ld = [{
    '@context': 'https://schema.org', '@type': 'Organization', name: 'Meta Origin', alternateName: 'Meta Origin Software', url: SITE, logo: `${SITE}img/company-logo.png`,
    email: D.company.emails[0], sameAs: [D.company.facebook, D.company.youtube, D.company.instagram].filter(Boolean),
    contactPoint: { '@type': 'ContactPoint', telephone: `+20${D.company.whatsapp.replace(/^0/, '')}`, contactType: 'customer support', availableLanguage: ['Arabic', 'English'] },
  }, { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Meta Origin', url: SITE, inLanguage: LANG }];
  return head({ title: L('Meta Origin | برامج إدارة الشركات والمحلات', 'Meta Origin | Business management software'), desc: company('about'), accent: '#3b82f6', base, image: 'img/company-logo.png', ld }) + header(base) + `
    <main class="max-w-6xl mx-auto px-4 py-10 w-full space-y-14">
        <section class="text-center space-y-6">
            <img src="${base}img/company-logo.png" alt="Meta Origin" class="w-28 h-28 md:w-32 md:h-32 mx-auto rounded-3xl border border-gray-800 bg-gray-900 p-1 glow-effect">
            <div class="space-y-3">
                <h1 class="text-4xl md:text-6xl font-black text-white tracking-wide">Meta Origin</h1>
                <p class="text-gray-400 font-bold">${esc(company('tagline'))}</p>
                <p class="text-gray-300 max-w-3xl mx-auto text-sm md:text-base leading-relaxed">${esc(company('about'))}</p>
            </div>
            <div class="flex flex-wrap justify-center gap-3">
                <a href="#programs" class="bg-acc px-6 py-3 rounded-xl font-extrabold shadow-lg active:scale-95 flex items-center gap-2"><i class="fa-solid fa-grip"></i> ${L('تصفّح البرامج', 'Browse programs')}</a>
                <a href="${wa(D.company.whatsapp, L('عايز أعرف أكتر عن برامج Meta Origin', 'I would like to know more about Meta Origin programs'))}" target="_blank" rel="noopener noreferrer" class="bg-gray-800 hover:bg-gray-700 border border-gray-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2"><i class="fa-brands fa-whatsapp text-emerald-400"></i> ${L('كلّمنا واتساب', 'WhatsApp us')}</a>
                <a href="${esc(D.company.youtube)}" target="_blank" rel="noopener noreferrer" class="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"><i class="fa-brands fa-youtube"></i> ${L('قناتنا على اليوتيوب', 'Our YouTube channel')}</a>
                <a href="${esc(D.company.facebook)}" target="_blank" rel="noopener noreferrer" class="bg-[#1877f2] hover:brightness-110 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"><i class="fa-brands fa-facebook"></i> ${L('صفحتنا على الفيسبوك', 'Facebook page')}</a>
                <a href="${esc(D.company.instagram)}" target="_blank" rel="noopener noreferrer" class="text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:brightness-110" style="background:linear-gradient(45deg,#f09433,#dc2743,#bc1888)"><i class="fa-brands fa-instagram"></i> ${L('انستجرام', 'Instagram')}</a>
                <a href="mailto:${esc(D.company.emails[0])}" class="bg-gray-800 hover:bg-gray-700 border border-gray-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2"><i class="fa-solid fa-envelope acc"></i> ${L('راسلنا بالإيميل', 'Email us')}</a>
            </div>
            <div class="flex flex-wrap justify-center gap-3 pt-2 text-xs md:text-sm text-gray-300">
                <div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid fa-layer-group acc"></i><span><strong class="text-white">${D.programs.length}</strong> ${L('برنامج', 'programs')}</span></div>
                <div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid fa-language acc"></i><span>${L('عربي و English', 'English & Arabic')}</span></div>
                <div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid fa-network-wired acc"></i><span>${L('جهاز واحد أو شبكة أو أونلاين', 'One PC, network or online')}</span></div>
                <div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid fa-gift acc"></i><span>${L('14 يوم تجربة مجانية', '14-day free trial')}</span></div>
                <div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid fa-headset acc"></i><span>${L('دعم فني وتركيب', 'Support & installation')}</span></div>
                ${totalDl >= DL_MIN ? `<div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid fa-download acc"></i><span><strong class="text-white">${fmtNum(totalDl)}</strong> ${L('تحميل', 'downloads')}</span></div>` : ''}
            </div>
        </section>
${picker}

        <section id="programs" class="space-y-8">
            <div class="text-center space-y-2">
                <h2 class="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-2"><i class="fa-solid fa-grip acc"></i><span>${L('برامجنا', 'Our programs')}</span></h2>
                <p class="text-gray-400 text-xs md:text-sm">${L('اختار البرنامج عشان تشوف تفاصيله وتحمّله', 'Pick a program to see its details and download it')}</p>
                <div class="max-w-md mx-auto pt-2"><input oninput="filterPrograms(this.value.toLowerCase())" placeholder="${L('ابحث عن برنامج (صيدلية، مطعم، مدرسة، مرتبات…)', 'Search (pharmacy, restaurant, school, payroll…)')}" class="w-full bg-cardbg border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"></div>
            </div>
${cats.map((c) => `            <div data-cat="${c.id}" class="space-y-4">
                <h3 class="text-lg font-extrabold text-gray-200 ${L('border-r-4 pr-3', 'border-l-4 pl-3')}" style="border-color:#3b82f6">${esc(c.name)}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
${c.items.map(card).join('\n')}
                </div>
            </div>`).join('\n')}
            <p id="noResult" class="text-center text-gray-400" style="display:none">${L('مفيش برنامج بالاسم ده —', 'No program matches —')} <a class="acc underline" href="${wa(D.company.whatsapp, L('محتاج برنامج لنشاطي', 'I need a program for my business'))}" target="_blank" rel="noopener noreferrer">${L('كلّمنا', 'contact us')}</a> ${L('وهنساعدك.', 'and we will help.')}</p>
        </section>

        <section id="why" class="space-y-6">
            <div class="text-center space-y-2">
                <h2 class="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-2"><i class="fa-solid fa-star acc"></i><span>${L('ليه برامج Meta Origin؟', 'Why Meta Origin?')}</span></h2>
                <p class="text-gray-400 text-xs md:text-sm">${L('حاجات موجودة في كل برامجنا', 'Included in all our programs')}</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
${D.company.strengths.map((x, i) => (LANG === 'en' && EN.company.strengths[i] ? { ...x, ...EN.company.strengths[i] } : x)).map((x) => `                <div class="bg-cardbg border border-gray-800 p-5 rounded-2xl space-y-2 border-t-2 card-hover" style="border-top-color:${x.color}">
                    <div class="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style="background:${x.color}1f;color:${x.color}"><i class="fa-solid ${x.icon}"></i></div>
                    <h3 class="text-base font-bold text-white">${esc(x.t)}</h3>
                    <p class="text-gray-400 text-xs leading-relaxed">${esc(x.d)}</p>
                </div>`).join('\n')}
            </div>
        </section>
${requestForm(base)}
${team(base)}
    </main>` + footer(base, 'Meta Origin');
}

// ---------------- المقارنات + المقالات + فورم الطلب ----------------
const CMP = JSON.parse(fs.readFileSync(path.join(HERE, 'compare.json'), 'utf8')).groups
  .map((g) => ({ ...g, slugs: g.slugs.filter((s) => D.programs.some((p) => p.slug === s)) })).filter((g) => g.slugs.length > 1);
const ART = JSON.parse(fs.readFileSync(path.join(HERE, 'articles.json'), 'utf8')).articles;
const prog = (s) => D.programs.find((p) => p.slug === s);
/** «مقالات عن البرنامج» في صفحة كل برنامج (عربي بس — المقالات عربي): المقال الخاص بيه (program = slug) الأول، وبعده اللي ليها علاقة */
function programArticles(p, base) {
  if (LANG !== 'ar') return '';
  const list = ART.filter((a) => a.program === p.slug || a.related.includes(p.slug)).sort((x, y) => (y.program === p.slug) - (x.program === p.slug)).slice(0, 7);
  if (!list.length) return '';
  return `
        <section id="articles" class="space-y-6">
            <div class="text-center space-y-2">
                <h2 class="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-2"><i class="fa-solid fa-newspaper acc"></i><span>مقالات عن البرنامج</span></h2>
                <p class="text-gray-400 text-xs md:text-sm">نصايح عملية لشغلك — <a class="acc underline" href="${base}articles/">كل المقالات</a></p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
${list.map((a) => `                <a href="${base}articles/${a.slug}/" class="flex gap-4 bg-cardbg border border-gray-800 hover:border-gray-600 rounded-2xl p-5 card-hover${a.program === p.slug ? ' md:col-span-2' : ''}">
                    <i class="fa-solid ${esc(a.icon)} acc text-2xl mt-1 flex-shrink-0"></i>
                    <span class="space-y-1"><span class="block font-bold text-white leading-7">${bidi(a.t)}</span><span class="block text-gray-400 text-sm leading-6">${bidi(a.d)}</span></span>
                </a>`).join('\n')}
            </div>
        </section>`;
}
// النص العربي اللي فيه أسماء إنجليزي (Cashier ولا Hotel Pro؟): كل اسم إنجليزي في <bdi> عشان علامات الترقيم ماتتنقلش
const bidi = (t) => (LANG === 'ar' ? esc(t).replace(/[A-Za-z][A-Za-z0-9.]*(?:[ -][A-Za-z0-9][A-Za-z0-9.]*)*/g, (m) => `<bdi>${m}</bdi>`) : esc(t));
const homeOf = (base) => (LANG === 'en' ? base + 'en/' : base);

/** فورم «اطلب البرنامج»: بيكتب رسالة واتساب جاهزة بالبيانات (مفيش أي حاجة بتتحفظ أو بتتبعت لسيرفر) */
function requestForm(base, p) {
  const opts = D.programs.map((x) => `<option value="${esc(x.product)}"${p && x.slug === p.slug ? ' selected' : ''}>${esc(x.product.replace('Meta Origin - ', ''))} — ${esc(pName(x))}</option>`).join('');
  const field = 'w-full bg-darkbg border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-acc';
  return `
        <section id="request" class="bg-cardbg border border-gray-800 rounded-3xl p-6 md:p-8 space-y-5 glow-effect">
            <div class="text-center space-y-2">
                <h2 class="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-2"><i class="fa-solid fa-paper-plane acc"></i><span>${p ? L('اطلب البرنامج', 'Request the program') : L('اطلب برنامجك', 'Request a program')}</span></h2>
                <p class="text-gray-400 text-xs md:text-sm">${L('اكتب بياناتك ودوس «ابعت على الواتساب» — هتتفتح رسالة جاهزة تبعتها لينا، ونرد عليك بسرعة.', 'Fill in your details and press «Send on WhatsApp» — a ready message opens for you to send us, and we reply quickly.')}</p>
            </div>
            <form onsubmit="return sendRequest(this)" class="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
                <label class="space-y-1"><span class="text-xs font-bold text-gray-300">${L('الاسم', 'Name')} *</span><input name="name" required maxlength="60" class="${field}" placeholder="${L('اسمك', 'Your name')}"></label>
                <label class="space-y-1"><span class="text-xs font-bold text-gray-300">${L('اسم المكان ونشاطه', 'Business name & type')} *</span><input name="biz" required maxlength="80" class="${field}" placeholder="${L('مثلًا: صيدلية النور', 'e.g. Al Nour Pharmacy')}"></label>
                <label class="space-y-1"><span class="text-xs font-bold text-gray-300">${L('البرنامج', 'Program')}</span><select name="prog" class="${field}"><option value="">${L('مش متأكد — ساعدوني أختار', 'Not sure — help me choose')}</option>${opts}</select></label>
                <label class="space-y-1"><span class="text-xs font-bold text-gray-300">${L('المحافظة / المدينة', 'City')}</span><input name="city" maxlength="40" class="${field}" placeholder="${L('مثلًا: بورسعيد', 'e.g. Cairo')}"></label>
                <label class="space-y-1"><span class="text-xs font-bold text-gray-300">${L('عدد الأجهزة', 'Number of PCs')}</span><select name="pcs" class="${field}"><option>${L('جهاز واحد', 'One PC')}</option><option>${L('2 – 3 أجهزة', '2 – 3 PCs')}</option><option>${L('4 – 10 أجهزة', '4 – 10 PCs')}</option><option>${L('أكتر من 10', 'More than 10')}</option><option>${L('لسه مش عارف', 'Not sure yet')}</option></select></label>
                <label class="space-y-1"><span class="text-xs font-bold text-gray-300">${L('محتاج إيه؟', 'What do you need?')}</span><select name="need" class="${field}"><option>${L('أعرف السعر', 'A price quote')}</option><option>${L('أجرّب البرنامج', 'To try the program')}</option><option>${L('تركيب وتدريب', 'Installation & training')}</option><option>${L('عندي سؤال', 'I have a question')}</option></select></label>
                <label class="space-y-1 md:col-span-2"><span class="text-xs font-bold text-gray-300">${L('ملاحظات (اختياري)', 'Notes (optional)')}</span><textarea name="notes" rows="2" maxlength="400" class="${field}" placeholder="${L('أي تفاصيل عن شغلك', 'Anything about your business')}"></textarea></label>
                <div class="md:col-span-2 flex flex-col items-center gap-2 pt-1">
                    <button class="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-3 rounded-xl font-extrabold flex items-center gap-2 shadow-lg active:scale-95"><i class="fa-brands fa-whatsapp text-lg"></i> ${L('ابعت على الواتساب', 'Send on WhatsApp')}</button>
                    <p class="text-[11px] text-gray-500">${L('البيانات مش بتتحفظ في الموقع — بتروح في رسالة الواتساب اللي انت بتبعتها بنفسك.', 'Nothing is stored on this site — the details go only in the WhatsApp message you send yourself.')}</p>
                </div>
            </form>
        </section>`;
}
const requestJs = () => {
  const T = (ar, en) => JSON.stringify(L(ar, en));
  return `
        function sendRequest(f) {
            const v = (n) => (f.elements[n].value || '').trim();
            const rows = [[${T('الاسم', 'Name')}, v('name')], [${T('المكان', 'Business')}, v('biz')], [${T('البرنامج', 'Program')}, v('prog') || ${T('مش متأكد — ساعدوني أختار', 'Not sure — help me choose')}],
                [${T('المدينة', 'City')}, v('city')], [${T('عدد الأجهزة', 'PCs')}, v('pcs')], [${T('محتاج', 'Need')}, v('need')], [${T('ملاحظات', 'Notes')}, v('notes')]];
            const text = ${T('السلام عليكم، عايز أطلب برنامج من Meta Origin:', 'Hello, I would like to request a Meta Origin program:')} + '\\n\\n' + rows.filter((r) => r[1]).map((r) => r[0] + ': ' + r[1]).join('\\n');
            window.open('https://wa.me/2${D.company.whatsapp}?text=' + encodeURIComponent(text), '_blank', 'noopener');
            return false;
        }`;
};

/** كارت «مش عارف تختار؟» في صفحة البرنامج لو ليه مقارنة */
function compareLink(p, base) {
  const g = CMP.find((x) => x.slugs.includes(p.slug));
  if (!g) return '';
  const others = g.slugs.filter((s) => s !== p.slug).map((s) => `<bdi>${esc(prog(s).product.replace('Meta Origin - ', ''))}</bdi>`).join(L(' ولا ', ' and '));
  return `
        <a href="${homeOf(base)}compare/#${g.id}" class="block bg-cardbg border border-gray-800 hover:border-gray-600 rounded-2xl p-5 card-hover">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-acc-soft flex items-center justify-center text-xl flex-shrink-0"><i class="fa-solid fa-scale-balanced"></i></div>
                <div class="min-w-0 flex-1"><div class="font-extrabold text-white">${L('مش متأكد ده ولا ' + others + '؟', 'Not sure between this and ' + others + '?')}</div>
                <div class="text-sm text-gray-400">${L('شوف المقارنة بينهم في جدول واحد', 'See them compared side by side')}</div></div>
                <i class="fa-solid fa-arrow-${L('left', 'right')} acc"></i>
            </div>
        </a>`;
}

function comparePage() {
  const base = L('../', '../../');
  const home = homeOf(base);
  return head({ title: L('مقارنة البرامج | Meta Origin', 'Compare programs | Meta Origin'), desc: L('الفرق بين برامج Meta Origin القريبة من بعض: الكاشيرات، الفنادق، الحسابات، والمصانع — عشان تختار المناسب.', 'The difference between similar Meta Origin programs: cashiers, hotels, accounting and factories.'), accent: '#3b82f6', base, image: 'img/company-logo.png', sub: 'compare/' }) + header(base, { back: true, sub: 'compare/' }) + `
    <main class="max-w-6xl mx-auto px-4 py-10 w-full space-y-12">
        <section class="text-center space-y-3">
            <h1 class="text-3xl md:text-5xl font-black text-white flex items-center justify-center gap-3"><i class="fa-solid fa-scale-balanced acc"></i>${L('مقارنة البرامج', 'Compare programs')}</h1>
            <p class="text-gray-400 max-w-2xl mx-auto">${L('محتار بين برنامجين شبه بعض؟ هنا الفرق بينهم في جدول واحد.', 'Torn between two similar programs? Here is the difference in one table.')}</p>
            <div class="flex flex-wrap justify-center gap-2 pt-2">${CMP.map((g) => `<a href="#${g.id}" class="bg-cardbg border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-xl text-sm font-bold text-gray-200"><i class="fa-solid ${g.icon} acc"></i> <span>${bidi(g[LANG].t)}</span></a>`).join('')}</div>
        </section>
${CMP.map((g) => { const ps = g.slugs.map(prog); return `        <section id="${g.id}" class="space-y-5 scroll-mt-24">
            <div class="space-y-1">
                <h2 class="text-2xl font-bold text-white flex items-center gap-2"><i class="fa-solid ${g.icon} acc"></i><span class="min-w-0">${bidi(g[LANG].t)}</span></h2>
                <p class="text-gray-400 text-sm">${bidi(g[LANG].d)}</p>
            </div>
            <div class="overflow-x-auto rounded-2xl border border-gray-800">
                <table class="w-full text-sm min-w-[560px]">
                    <thead><tr class="bg-cardbg">
                        <th class="p-3 w-36"></th>
${ps.map((p) => `                        <th class="p-3 text-${L('right', 'left')} align-top"><a href="${home}${p.slug}/" class="flex items-center gap-2 group"><img src="${base}icons/${p.slug}.png" alt="" class="w-9 h-9 rounded-lg flex-shrink-0"><span><span class="block font-extrabold text-white group-hover:underline" dir="ltr">${esc(p.product.replace('Meta Origin - ', ''))}</span><span class="block text-[11px] font-bold" style="color:${p.color}">${esc(pName(p))}</span></span></a></th>`).join('\n')}
                    </tr></thead>
                    <tbody>
${g.rows.map((r) => `                        <tr class="border-t border-gray-800"><th class="p-3 text-${L('right', 'left')} text-gray-400 font-bold align-top">${esc(r[LANG])}</th>${ps.map((p) => { const c = (r.v[p.slug] || ['—', '—'])[LANG === 'en' ? 1 : 0]; return `<td class="p-3 text-gray-200 align-top">${c === '✓' ? '<i class="fa-solid fa-circle-check text-emerald-400"></i>' : esc(c)}</td>`; }).join('')}</tr>`).join('\n')}
                        <tr class="border-t border-gray-800 bg-cardbg"><th class="p-3 text-${L('right', 'left')} acc font-bold align-top">${L('اختاره لو…', 'Choose it if…')}</th>${ps.map((p) => `<td class="p-3 align-top"><p class="text-white font-bold">${esc((g.pick[p.slug] || ['', ''])[LANG === 'en' ? 1 : 0])}</p><a href="${home}${p.slug}/" class="inline-flex items-center gap-1 mt-2 text-xs font-bold acc hover:underline">${L('تفاصيل وتحميل', 'Details & download')} <i class="fa-solid fa-arrow-${L('left', 'right')}"></i></a></td>`).join('')}</tr>
                    </tbody>
                </table>
            </div>
        </section>`; }).join('\n')}
${requestForm(base)}
    </main>` + footer(base, 'Meta Origin');
}

/** المقالات (عربي بس): فهرس + صفحة لكل مقالة */
function articlesIndex() {
  const base = '../';
  return head({ title: 'مقالات ونصايح | Meta Origin', desc: 'نصايح عملية لأصحاب المحلات والصيدليات والمطاعم والشركات: اختيار البرنامج، تقفيل الوردية، النسخ الاحتياطي.', accent: '#3b82f6', base, image: 'img/company-logo.png', sub: 'articles/', arOnly: true }) + header(base, { back: true, sub: '' }) + `
    <main class="max-w-4xl mx-auto px-4 py-10 w-full space-y-8">
        <section class="text-center space-y-3">
            <h1 class="text-3xl md:text-5xl font-black text-white flex items-center justify-center gap-3"><i class="fa-solid fa-newspaper acc"></i>مقالات ونصايح</h1>
            <p class="text-gray-400">نصايح عملية لشغلك — من خبرتنا مع المحلات والصيدليات والمطاعم والشركات.</p>
        </section>
${ART.map((a) => `        <a href="${a.slug}/" class="block bg-cardbg border border-gray-800 rounded-2xl p-6 card-hover space-y-2">
            <div class="flex items-center gap-3"><div class="w-11 h-11 rounded-xl bg-acc-soft flex items-center justify-center text-lg flex-shrink-0"><i class="fa-solid ${a.icon}"></i></div><h2 class="text-lg md:text-xl font-extrabold text-white">${esc(a.t)}</h2></div>
            <p class="text-gray-400 text-sm leading-relaxed">${esc(a.d)}</p>
            <span class="text-xs text-gray-500"><i class="fa-solid fa-calendar-day"></i> ${fmtDay(a.date)}</span>
        </a>`).join('\n')}
    </main>` + footer(base, 'Meta Origin');
}

function articlePage(a) {
  const base = '../../';
  const url = `${SITE}articles/${a.slug}/`;
  const ld = [{ '@context': 'https://schema.org', '@type': 'Article', headline: a.t, description: a.d, datePublished: a.date, dateModified: a.date, inLanguage: 'ar',
    mainEntityOfPage: url, image: `${SITE}img/company-logo.png`, author: { '@type': 'Organization', name: 'Meta Origin', url: SITE }, publisher: { '@type': 'Organization', name: 'Meta Origin', logo: { '@type': 'ImageObject', url: `${SITE}img/company-logo.png` } } }];
  const block = ([k, v]) => k === 'h' ? `<h2 class="text-xl md:text-2xl font-bold text-white pt-4">${esc(v)}</h2>`
    : k === 'ul' ? `<ul class="list-disc ps-6 space-y-2 text-gray-300 leading-8">${v.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`
    : k === 'tip' ? `<div class="bg-acc-soft border border-acc rounded-2xl p-5 text-gray-100 leading-8"><i class="fa-solid fa-lightbulb acc"></i> ${esc(v)}</div>`
    : `<p class="text-gray-300 leading-8">${esc(v)}</p>`;
  const rel = a.related.map(prog).filter(Boolean);
  return head({ title: `${a.t} | Meta Origin`, desc: a.d, accent: rel[0]?.color || '#3b82f6', base, image: rel[0] && fs.existsSync(path.join(HERE, 'img', 'og', `${rel[0].slug}.jpg`)) ? `img/og/${rel[0].slug}.jpg` : 'img/company-logo.png', sub: `articles/${a.slug}/`, ld, arOnly: true }) + header(base, { back: true, sub: '' }) + `
    <main class="max-w-3xl mx-auto px-4 py-10 w-full space-y-5">
        <a href="../" class="text-sm acc font-bold hover:underline"><i class="fa-solid fa-arrow-right"></i> كل المقالات</a>
        <h1 class="text-3xl md:text-4xl font-black text-white leading-tight">${esc(a.t)}</h1>
        <p class="text-gray-500 text-sm"><i class="fa-solid fa-calendar-day"></i> ${fmtDay(a.date)} · Meta Origin</p>
        <article class="space-y-4">
${a.b.map(block).join('\n')}
        </article>
        ${rel.length ? `<section class="pt-6 space-y-3"><h2 class="text-lg font-bold text-white">برامج ليها علاقة</h2><div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${rel.map((p) => `<a href="${base}${p.slug}/" class="flex items-center gap-3 bg-cardbg border border-gray-800 hover:border-gray-600 rounded-xl p-3"><img src="${base}icons/${p.slug}.png" alt="" class="w-10 h-10 rounded-lg"><span><span class="block font-bold text-white text-sm" dir="ltr">${esc(p.product.replace('Meta Origin - ', ''))}</span><span class="block text-xs" style="color:${p.color}">${esc(p.nameAr)}</span></span></a>`).join('')}</div></section>` : ''}
${requestForm(base, rel.length === 1 ? rel[0] : null)}
    </main>` + footer(base, 'Meta Origin');
}

/** «آخر التحديثات»:أحدث إصدار لكل برنامج بتاريخه (الأحدث فوق) + سجل كل الإصدارات لكل برنامج (updates.json) */
function updatesPage() {
  const base = L('../', '../../');
  const home = LANG === 'en' ? base + 'en/' : base;
  const progs = D.programs.filter((p) => REL[p.slug] || Object.keys(UPDATES[p.slug] || {}).length);
  const latest = progs.filter((p) => REL[p.slug]).sort((a, b) => REL[b.slug].date.localeCompare(REL[a.slug].date) || a.product.localeCompare(b.product));
  // الإصدارات اللي نزلت نفس اليوم بنفس الملاحظات (زي ميزة نزلت في كل البرامج) = كارت واحد
  const groups = [];
  for (const p of latest) {
    const r = REL[p.slug]; const key = r.date + '|' + r.notes.join('|');
    const g = groups.find((x) => x.key === key);
    if (g) g.items.push(p); else groups.push({ key, date: r.date, notes: r.notes, items: [p] });
  }
  const notesDir = LANG === 'en' ? ' dir="rtl" lang="ar"' : '';
  const li = (n) => `<li class="flex gap-2"><i class="fa-solid fa-check acc mt-1 flex-shrink-0"></i><span>${esc(n)}</span></li>`;
  const icon = (p) => `<img src="${base}icons/${p.slug}.png" alt="" class="w-12 h-12 rounded-xl flex-shrink-0" loading="lazy">`;
  return head({ title: L('آخر التحديثات | Meta Origin', 'Latest updates | Meta Origin'), desc: L('كل الإصدارات الجديدة من برامج Meta Origin وإيه اللي اتضاف في كل إصدار.', 'Every new release of Meta Origin programs and what each one added.'), accent: '#3b82f6', base, image: 'img/company-logo.png', sub: 'updates/' }) + header(base, { back: true, sub: 'updates/' }) + `
    <main class="max-w-5xl mx-auto px-4 py-10 w-full space-y-12">
        <section class="text-center space-y-3">
            <h1 class="text-3xl md:text-5xl font-black text-white flex items-center justify-center gap-3"><i class="fa-solid fa-bolt acc"></i>${L('آخر التحديثات', 'Latest updates')}</h1>
            <p class="text-gray-400 max-w-2xl mx-auto">${L('برامجنا بتتطور باستمرار — كل إصدار جديد هنا بتاريخه وإيه اللي اتضاف فيه.', 'Our programs keep improving — every new release is listed here with its date and what it added.')}</p>
            ${LANG === 'en' ? '<p class="text-xs text-gray-500">Release notes are written in Arabic.</p>' : ''}
        </section>

        <section class="space-y-4">
            <h2 class="text-xl md:text-2xl font-bold text-white flex items-center gap-2"><i class="fa-solid fa-star acc"></i>${L('أحدث الإصدارات', 'Newest releases')}</h2>
${groups.map((g) => `            <article class="bg-cardbg border border-gray-800 rounded-2xl p-5 space-y-4" style="border-${L('right', 'left')}:3px solid ${g.items.length === 1 ? g.items[0].color : 'var(--acc)'}">
                <div class="flex items-center gap-2 text-sm text-gray-400"><i class="fa-solid fa-calendar-day acc"></i> ${fmtDay(g.date)}${g.items.length > 1 ? ` · ${L(`نزل في <strong class="text-white">${g.items.length}</strong> برنامج`, `released for <strong class="text-white">${g.items.length}</strong> programs`)}` : ''}</div>
                ${g.notes.length ? `<ul class="space-y-1.5 text-gray-200"${notesDir}>${g.notes.map(li).join('')}</ul>` : ''}
                <div class="grid grid-cols-1 sm:grid-cols-2 ${g.items.length > 2 ? 'lg:grid-cols-3' : ''} gap-2">
${g.items.map((p) => `                    <a href="${home}${p.slug}/#downloads" class="flex items-center gap-3 bg-darkbg border border-gray-800 hover:border-gray-600 rounded-xl p-2.5 transition">
                        <img src="${base}icons/${p.slug}.png" alt="" class="w-9 h-9 rounded-lg flex-shrink-0" loading="lazy">
                        <span class="min-w-0 flex-1"><span class="block font-bold text-white text-sm truncate" dir="ltr">${esc(p.product.replace('Meta Origin - ', ''))}</span><span class="block text-[11px] truncate" style="color:${p.color}">${esc(pName(p))}</span></span>
                        <span class="text-[11px] bg-acc-soft px-2 py-0.5 rounded-full font-bold" dir="ltr">v${esc(REL[p.slug].version)}</span>
                    </a>`).join('\n')}
                </div>
            </article>`).join('\n')}
        </section>

        <section class="space-y-4">
            <h2 class="text-xl md:text-2xl font-bold text-white flex items-center gap-2"><i class="fa-solid fa-clock-rotate-left acc"></i>${L('سجل الإصدارات لكل برنامج', 'Release history by program')}</h2>
${progs.filter((p) => Object.keys(UPDATES[p.slug] || {}).length).map((p) => { const vs = Object.keys(UPDATES[p.slug]).sort(vcmp); return `            <details id="${p.slug}" class="bg-cardbg border border-gray-800 rounded-2xl p-5 group scroll-mt-24">
                <summary class="cursor-pointer list-none flex items-center gap-4">
                    ${icon(p)}
                    <div class="min-w-0 flex-1"><div class="font-extrabold text-white" dir="ltr">${esc(p.product)}</div><div class="text-xs text-gray-400">${vs.length} ${L('إصدار', vs.length > 1 ? 'releases' : 'release')}</div></div>
                    <i class="fa-solid fa-chevron-down acc text-xs transition group-open:rotate-180"></i>
                </summary>
                <div class="mt-4 space-y-4 ${L('border-r-2 pr-4', 'border-l-2 pl-4')} border-gray-800">
${vs.map((v) => `                    <div class="space-y-1.5">
                        <div class="font-bold text-white text-sm" dir="ltr">v${esc(v)}${REL[p.slug]?.version === v ? ` <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">${L('الحالي', 'current')}</span>` : ''}</div>
                        <ul class="space-y-1 text-sm text-gray-300"${notesDir}>${(UPDATES[p.slug][v] || []).map(li).join('')}</ul>
                    </div>`).join('\n')}
                </div>
            </details>`; }).join('\n')}
        </section>
    </main>
    <script>if (location.hash) { const d = document.getElementById(location.hash.slice(1)); if (d && d.tagName === 'DETAILS') d.open = true; }</script>` + footer(base, 'Meta Origin');
}

/** سياسة الخصوصية (عربي + إنجليزي) — جوجل ومايكروسوفت بيطلبوا رابطها عشان النسخ الاحتياطي على Google Drive / OneDrive */
function privacyPage() {
  const base = '../';
  const mail = D.company.emails[0];
  const sec = (t, body) => `<section class="bg-cardbg border border-gray-800 rounded-2xl p-6 space-y-3"><h2 class="text-lg md:text-xl font-bold text-white">${t}</h2>${body}</section>`;
  const ul = (items) => `<ul class="list-disc ps-6 space-y-2 text-gray-300 leading-8">${items.map((x) => `<li>${x}</li>`).join('')}</ul>`;
  return head({ title: 'سياسة الخصوصية | Meta Origin', desc: 'سياسة الخصوصية لبرامج Meta Origin — Privacy Policy', accent: '#3b82f6', base, image: 'img/company-logo.png' }) + header(base, { back: true, sub: '' }) + `
    <main class="max-w-4xl mx-auto px-4 py-10 space-y-6 w-full">
        <h1 class="text-3xl md:text-4xl font-black text-white">سياسة الخصوصية</h1>
        <p class="text-gray-400">آخر تحديث: 28 أكتوبر 2026 — تنطبق على كل برامج Meta Origin (Meta Origin Software).</p>
${sec('بياناتك على جهازك', ul([
  'برامجنا بتشتغل على أجهزة العميل نفسه: كل بيانات الشغل (المبيعات، الحسابات، العملاء، الموظفين…) بتتحفظ على جهاز العميل أو السيرفر بتاعه، ومش بتتبعت لينا.',
  'إحنا مش بنبيع ولا بنشارك أي بيانات مع أي حد، ومش بنستخدمها في إعلانات.',
]))}
${sec('الترخيص', ul([
  'عشان التفعيل، البرنامج بيبعت لسيرفر التراخيص بتاعنا «كود الجهاز» (رقم محسوب من مكونات الجهاز، مش بيكشف أي بيانات شخصية) واسم البرنامج وإصداره.',
  'لو العميل بعت «طلب تفعيل» بنفسه، بيوصلنا الاسم ورقم الواتساب ونوع النشاط اللي كتبهم — بنستخدمهم للتواصل معاه بس.',
]))}
${sec('النسخ الاحتياطي على Google Drive و OneDrive', ul([
  'الميزة اختيارية — العميل هو اللي بيربط حسابه من صفحة الدخول الرسمية بتاعة جوجل أو مايكروسوفت، والبرنامج <b>عمره ما بيشوف باسورد الحساب</b>.',
  'الإذن اللي البرنامج بيطلبه محدود: في Google Drive الملفات اللي البرنامج نفسه عملها بس (drive.file)، وفي OneDrive فولدر البرنامج بس (App Folder). البرنامج مايقدرش يشوف أي ملف تاني على الحساب.',
  'البرنامج بيستخدم الإذن ده في حاجة واحدة: رفع نسخ احتياطية من بيانات البرنامج، وعرضها، وتنزيلها للاسترجاع، ومسح الأقدم حسب العدد اللي العميل اختاره.',
  'كل نسخة بتتشفّر (AES-256) بكلمة سر بيختارها العميل <b>قبل</b> ما تطلع من جهازه — ولا جوجل ولا مايكروسوفت ولا إحنا نقدر نفتحها.',
  'بيانات الربط (التوكن) بتتحفظ متشفّرة على جهاز العميل بس، ومش بتتبعت لسيرفراتنا. النسخ بتروح مباشرة من جهاز العميل لحسابه.',
  'تقدر تفك الربط من البرنامج («فك الربط») أو من إعدادات حسابك: <a class="acc underline" href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">حساب جوجل</a> / <a class="acc underline" href="https://account.live.com/consent/Manage" target="_blank" rel="noopener">حساب مايكروسوفت</a>.',
  'استخدام ونقل أي معلومات جاية من Google APIs ملتزم بـ <a class="acc underline" href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener">Google API Services User Data Policy</a> بما فيها شروط Limited Use.',
]))}
${sec('التواصل', `<p class="text-gray-300 leading-8">لأي سؤال عن الخصوصية: <a class="acc underline" href="mailto:${esc(mail)}">${esc(mail)}</a> أو واتساب <a class="acc underline" href="${wa(D.company.whatsapp)}" target="_blank" rel="noopener">${esc(D.company.whatsapp)}</a>.</p>`)}

        <div dir="ltr" lang="en" class="space-y-6 pt-6 text-left">
        <h1 class="text-3xl md:text-4xl font-black text-white">Privacy Policy</h1>
        <p class="text-gray-400">Last updated: October 28, 2026 — applies to all Meta Origin programs (Meta Origin Software).</p>
${sec('Your data stays on your computer', ul([
  'Our programs run on the customer\'s own computers. All business data (sales, accounts, customers, employees…) is stored on the customer\'s device or their own server and is not sent to us.',
  'We do not sell or share any data with anyone, and we do not use it for advertising.',
]))}
${sec('Licensing', ul([
  'For activation, the program sends our license server a "machine code" (a value derived from the computer\'s hardware that does not reveal personal information), the program name and its version.',
  'If a customer chooses to send an "activation request", we receive the name, WhatsApp number and business type they entered — used only to contact them.',
]))}
${sec('Backups to Google Drive and OneDrive', ul([
  'This feature is optional. The customer connects their own account through Google\'s or Microsoft\'s official sign-in page; the program <b>never sees the account password</b>.',
  'The requested access is limited: on Google Drive only the files the program itself created (drive.file scope); on OneDrive only the program\'s app folder (Files.ReadWrite.AppFolder). The program cannot see any other file in the account.',
  'The access is used for one purpose only: uploading backups of the program\'s data, listing them, downloading them for restore, and deleting older backups beyond the number the customer chose.',
  'Every backup is encrypted (AES-256) with a password chosen by the customer <b>before</b> it leaves their computer — neither Google, Microsoft nor we can open it.',
  'The connection tokens are stored encrypted on the customer\'s computer only and are never sent to our servers. Backups go directly from the customer\'s computer to their own account.',
  'You can disconnect from the program ("Disconnect") or from your account settings: <a class="acc underline" href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">Google Account</a> / <a class="acc underline" href="https://account.live.com/consent/Manage" target="_blank" rel="noopener">Microsoft account</a>.',
  'Meta Origin\'s use and transfer of information received from Google APIs adheres to the <a class="acc underline" href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener">Google API Services User Data Policy</a>, including the Limited Use requirements.',
]))}
${sec('Contact', `<p class="text-gray-300 leading-8">Privacy questions: <a class="acc underline" href="mailto:${esc(mail)}">${esc(mail)}</a> or WhatsApp +20 ${esc(D.company.whatsapp)}.</p>`)}
        </div>
    </main>` + footer(base, 'Meta Origin');
}

fs.mkdirSync(path.join(HERE, 'privacy'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'privacy', 'index.html'), privacyPage());
fs.rmSync(path.join(HERE, 'en'), { recursive: true, force: true }); // الإنجليزي بيتولّد كله من جديد (البرامج المخفية ماتفضلش)
for (const lang of ['ar', 'en']) {
  LANG = lang;
  const root = lang === 'en' ? path.join(HERE, 'en') : HERE;
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, 'index.html'), homePage());
  fs.mkdirSync(path.join(root, 'updates'), { recursive: true });
  fs.writeFileSync(path.join(root, 'updates', 'index.html'), updatesPage());
  fs.mkdirSync(path.join(root, 'compare'), { recursive: true });
  fs.writeFileSync(path.join(root, 'compare', 'index.html'), comparePage());
  if (lang === 'ar') {
    fs.rmSync(path.join(HERE, 'articles'), { recursive: true, force: true });
    fs.mkdirSync(path.join(HERE, 'articles'), { recursive: true });
    fs.writeFileSync(path.join(HERE, 'articles', 'index.html'), articlesIndex());
    for (const a of ART) { fs.mkdirSync(path.join(HERE, 'articles', a.slug), { recursive: true }); fs.writeFileSync(path.join(HERE, 'articles', a.slug, 'index.html'), articlePage(a)); }
  }
  for (const p of D.programs) {
    fs.mkdirSync(path.join(root, p.slug), { recursive: true });
    fs.writeFileSync(path.join(root, p.slug, 'index.html'), programPage(p));
  }
}
LANG = 'ar';
// صفحة 404: أي رابط غلط يرجع للرئيسية
fs.writeFileSync(path.join(HERE, '404.html'), `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=/"><title>Meta Origin</title><a href="/">Meta Origin</a>`);
fs.writeFileSync(path.join(HERE, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[SITE, ...D.programs.map((p) => `${SITE}${p.slug}/`), `${SITE}updates/`, `${SITE}compare/`, `${SITE}articles/`, ...ART.map((a) => `${SITE}articles/${a.slug}/`), `${SITE}en/`, ...D.programs.map((p) => `${SITE}en/${p.slug}/`), `${SITE}en/updates/`, `${SITE}en/compare/`, `${SITE}privacy/`].map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(HERE, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`);
console.log(`index.html + ${D.programs.length} صفحة برنامج (عربي + إنجليزي تحت /en/)`);
// ملف التصميم الجاهز من الـ classes اللي في الصفحات، وبعدين رقم نسخته (hash) في كل صفحة عشان المتصفح مايفضلش على القديم
const { buildCss } = await import('./build-css.mjs');
await buildCss();
const cssHash = (await import('node:crypto')).createHash('sha1').update(fs.readFileSync(path.join(HERE, 'assets', 'site.css'))).digest('hex').slice(0, 10);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (['.git', 'node_modules', 'assets', 'img', 'icons', 'shots'].includes(e.name) ? [] : walk(path.join(d, e.name))) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []));
for (const f of walk(HERE)) { const h = fs.readFileSync(f, 'utf8'); if (h.includes('__CSSV__')) fs.writeFileSync(f, h.replaceAll('__CSSV__', cssHash)); }
