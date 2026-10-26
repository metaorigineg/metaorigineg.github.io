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
const YEAR = new Date().getFullYear();
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const wa = (n, text) => `https://wa.me/2${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
const rgb = (hex) => { const h = hex.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(','); };
// لون الكلام فوق لون البرنامج (حد الإضاءة 0.18 زي باقي البرامج)
const onColor = (hex) => {
  const [r, g, b] = rgb(hex).split(',').map((v) => { v = v / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.18 ? '#0b0f19' : '#ffffff';
};

function head({ title, desc, accent, base, image }) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(desc)}">
    <meta property="og:image" content="${esc(SITE + image.replace(/^(\.\.\/|\.\/)/, ''))}">
    <meta name="theme-color" content="#0b0f19">
    <link rel="icon" href="${base}img/company-logo.png">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800;900&display=swap" rel="stylesheet">
    <script>tailwind.config = { darkMode: 'class', theme: { extend: { colors: { darkbg: '#0b0f19', cardbg: '#111827' }, fontFamily: { sans: ['Cairo', 'sans-serif'] } } } }</script>
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
        .zoom.on { display: flex; } .zoom img { max-width: min(92vw, 640px); max-height: 90vh; border-radius: 18px; }
        .prog-card { --c: #3b82f6; } .prog-card:hover { border-color: var(--c); box-shadow: 0 10px 25px -8px color-mix(in srgb, var(--c) 40%, transparent); }
    </style>
</head>
<body class="min-h-screen flex flex-col justify-between">
    <div class="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 blur-3xl -z-10 pointer-events-none" style="background: linear-gradient(to bottom, rgba(var(--acc-rgb), .12), rgba(59,130,246,.05), transparent)"></div>`;
}

function header(base, { back } = {}) {
  return `
    <header class="w-full border-b border-gray-800/60 bg-darkbg/80 backdrop-blur-md sticky top-0 z-50">
        <div class="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center gap-3">
            <a href="${base}" class="flex items-center gap-3">
                <img src="${base}img/company-logo.png" alt="Meta Origin" class="w-10 h-10 object-cover rounded-xl bg-gray-900 border border-gray-800 p-0.5">
                <div>
                    <span class="font-black text-lg md:text-xl tracking-wide bg-gradient-to-l from-white via-gray-200 to-gray-400 bg-clip-text text-transparent block leading-tight">Meta Origin</span>
                    <span class="text-[10px] text-gray-400 font-semibold block">إدارة الأنظمة والبرمجيات</span>
                </div>
            </a>
            <div class="flex items-center gap-2">
                ${back ? `<a href="${base}#programs" class="hidden sm:flex items-center gap-2 bg-gray-800/60 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition border border-gray-700"><i class="fa-solid fa-grip acc"></i><span>كل البرامج</span></a>` : `<a href="#programs" class="hidden sm:flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 text-sm font-bold">البرامج</a><a href="#why" class="hidden md:flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 text-sm font-bold">المميزات</a><a href="#team" class="hidden sm:flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 text-sm font-bold">تواصل معنا</a>`}
                <button onclick="sharePage()" class="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition border border-gray-700 active:scale-95">
                    <i class="fa-solid fa-share-nodes acc"></i><span>مشاركة الصفحة</span>
                </button>
            </div>
        </div>
    </header>`;
}

function team(base, { title = 'فريق العمل وطرق التواصل' } = {}) {
  return `
        <section id="team" class="space-y-6 pt-4">
            <div class="text-center space-y-2">
                <h2 class="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-2"><i class="fa-solid fa-users acc"></i><span>${title}</span></h2>
                <p class="text-gray-400 text-xs md:text-sm">تواصل معنا مباشرة للدعم الفني والاستفسارات والتركيب</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
${D.team.map((m, i) => `                <div class="bg-cardbg border border-gray-800 rounded-2xl p-6 space-y-4 card-hover">
                    <div class="flex items-center gap-4 border-b border-gray-800 pb-4">
                        <img src="${base}${m.photo}" alt="${esc(m.name)}" title="اضغط لعرض الكارت كامل" onclick="zoomImg('${base}${m.card}')" class="w-16 h-16 rounded-full object-cover border-2 shadow-lg flex-shrink-0 cursor-zoom-in" style="border-color:${i ? '#38bdf8' : 'var(--acc)'}">
                        <div>
                            <span class="text-xs font-bold block mb-1" style="color:${i ? '#38bdf8' : 'var(--acc)'}">${esc(m.role)}</span>
                            <h3 class="text-lg font-extrabold text-white">${esc(m.nameAr)}</h3>
                            <span class="text-[11px] text-gray-400">${esc(m.name)}</span>
                        </div>
                    </div>
                    <p class="text-gray-300 text-xs leading-relaxed">${esc(m.bio)}</p>
                    <div class="space-y-2 pt-2">
                        <div class="text-xs font-bold text-gray-200 flex items-center gap-1.5 mb-2"><i class="fa-solid fa-headset text-sky-400"></i> للتواصل والواتساب:</div>
${m.phones.map((p) => `                        <div class="flex items-center justify-between bg-darkbg border ${p.main ? 'border-acc' : 'border-gray-800'} p-2.5 rounded-xl" ${p.main ? 'style="background:rgba(var(--acc-rgb),.05)"' : ''}>
                            <span class="font-mono font-bold text-sm ${p.main ? 'text-white' : 'text-gray-300'}" dir="ltr">${p.n}</span>
                            <a href="${wa(p.n)}" target="_blank" rel="noopener noreferrer" class="${p.main ? 'bg-acc' : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700'} px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                                <i class="fa-brands fa-whatsapp text-sm ${p.main ? '' : 'acc'}"></i> واتساب${p.main ? ' (الأساسي)' : ''}
                            </a>
                        </div>`).join('\n')}
                    </div>
                </div>`).join('\n')}
            </div>
        </section>`;
}

function footer(base, name) {
  return `
    <div id="toast" class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white border px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 transition-all duration-300 opacity-0 pointer-events-none translate-y-4 z-50" style="border-color:rgba(var(--acc-rgb),.5)">
        <i class="fa-solid fa-circle-check acc text-lg"></i><span id="toastMessage" class="text-xs md:text-sm font-bold">تم النسخ بنجاح!</span>
    </div>
    <div id="zoom" class="zoom" onclick="this.classList.remove('on')"><img id="zoomImg" alt=""></div>
    <a href="${wa(D.company.whatsapp, name === 'Meta Origin' ? 'عايز أعرف أكتر عن برامج Meta Origin' : `عندي سؤال عن ${name}`)}" target="_blank" rel="noopener noreferrer" title="كلّمنا واتساب" class="fixed bottom-5 left-5 z-40 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center text-3xl shadow-2xl active:scale-95"><i class="fa-brands fa-whatsapp"></i></a>
    <footer class="border-t border-gray-800/60 bg-darkbg py-8 mt-12">
        <div class="max-w-5xl mx-auto px-4 text-center space-y-3 text-gray-500 text-xs">
            <div class="flex items-center justify-center gap-2 mb-2">
                <img src="${base}img/company-logo.png" alt="Meta Origin" class="w-6 h-6 object-cover opacity-70 rounded-lg">
                <span class="font-bold text-gray-400">Meta Origin Software</span>
            </div>
            <div class="flex justify-center gap-4 text-base">
                <a href="${esc(D.company.facebook)}" target="_blank" rel="noopener noreferrer" class="hover:text-[#1877f2]" title="فيسبوك"><i class="fa-brands fa-facebook"></i> فيسبوك</a>
                <a href="${esc(D.company.youtube)}" target="_blank" rel="noopener noreferrer" class="hover:text-red-500" title="يوتيوب"><i class="fa-brands fa-youtube"></i> يوتيوب</a>
                <a href="${wa(D.company.whatsapp)}" target="_blank" rel="noopener noreferrer" class="hover:text-emerald-400" title="واتساب"><i class="fa-brands fa-whatsapp"></i> واتساب</a>
            </div>
            <p>جميع الحقوق محفوظة &copy; ${YEAR} - ${esc(name)}</p>
        </div>
    </footer>
    <script>
        function copyTextToClipboard(text, msg) {
            (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).catch(() => { const t = document.createElement('input'); document.body.appendChild(t); t.value = text; t.select(); document.execCommand('copy'); t.remove(); });
            showToast(msg);
        }
        function copyPassword(p) { copyTextToClipboard(p, 'تم نسخ كلمة السر (' + p + ') بنجاح!'); }
        function copyPageLink() { copyTextToClipboard(location.href, 'تم نسخ رابط الصفحة بنجاح!'); }
        function sharePage() { if (navigator.share) navigator.share({ title: document.title, url: location.href }).catch(() => {}); else copyPageLink(); }
        function showToast(m) {
            const t = document.getElementById('toast'); document.getElementById('toastMessage').textContent = m;
            t.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4'); t.classList.add('opacity-100', 'translate-y-0');
            setTimeout(() => { t.classList.remove('opacity-100', 'translate-y-0'); t.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4'); }, 3000);
        }
        function zoomImg(src) { document.getElementById('zoomImg').src = src; document.getElementById('zoom').classList.add('on'); }
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
                <h2 class="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-2"><i class="fa-solid fa-images acc"></i><span>صور من البرنامج</span></h2>
                <p class="text-gray-400 text-xs md:text-sm">اضغط على أي صورة عشان تكبّرها</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
${list.map((x) => `                <figure class="bg-cardbg border border-gray-800 rounded-2xl overflow-hidden card-hover cursor-zoom-in" onclick="zoomImg('${base}${x.f}')">
                    <img src="${base}${x.f}" alt="${esc(x.t)}" loading="lazy" class="w-full aspect-[16/10] object-cover object-top">
                    <figcaption class="px-4 py-2.5 text-sm font-bold text-gray-200">${esc(x.t)}</figcaption>
                </figure>`).join('\n')}
            </div>
        </section>`;
}

const FAQ = [
  ['البرنامج مجاني؟', 'بتجربه 14 يوم كاملين بكل الشاشات، وبعدها محتاج ترخيص — كلّمنا على الواتساب وهنقولك الأسعار المناسبة لنشاطك.'],
  ['ينفع يشتغل على أكتر من جهاز؟', 'أيوه: جهاز رئيسي عليه البيانات وأجهزة تانية على نفس الشبكة، وكتير من البرامج بتتفتح كمان من المتصفح والموبايل.'],
  ['بياناتي في أمان؟', 'البيانات على جهازك أنت، ومعاها نسخ احتياطي تلقائي في مكانين، وصلاحيات لكل موظف وسجل لكل عملية.'],
  ['البرنامج بالإنجليزي كمان؟', 'أيوه، البرنامج بيشتغل بالعربي والإنجليزي وتقدر تبدّل بينهم.'],
  ['لو حصلت مشكلة؟', 'جوّه البرنامج فيه زرار «إرسال تقرير مشكلة»، أو كلّمنا على الواتساب مباشرة وهنساعدك.'],
];
function installAndFaq(p) {
  const steps = [
    'حمّل البرنامج من «التحميل المباشر» أو أي سيرفر فوق، وفك الضغط (الملف RAR — بيتفتح بـ WinRAR أو 7-Zip).',
    'لو ويندوز طلّع رسالة «Windows protected your PC»: اضغط More info ← Run anyway (دي رسالة عادية لأي برنامج جديد مش من متجر مايكروسوفت).',
    `شغّل «${p.product} Setup.exe» واختار: الجهاز الرئيسي (اللي عليه البيانات) أو جهاز تاني على الشبكة.`,
    'اختار «تجربة 14 يوم» أو اكتب الترخيص — وكود الجهاز بيظهر في المعالج لو عايز تفعّل.',
    'افتح البرنامج وادخل، وابدأ من الشرح التفصيلي اللي جوّاه أو كلّمنا ونساعدك.',
  ];
  const req = [
    ['fa-brands fa-windows', 'Windows 10 أو 11 (64-bit)'],
    ['fa-solid fa-memory', 'رامات 4 جيجا أو أكتر (8 للجهاز الرئيسي على شبكة كبيرة)'],
    ['fa-solid fa-hard-drive', 'مساحة فاضية 1 جيجا على الأقل'],
    ['fa-solid fa-wifi', 'الشبكة: الأجهزة على نفس الراوتر/الشبكة بتاعة الجهاز الرئيسي'],
    ['fa-solid fa-print', 'بيشتغل مع طابعات الفواتير الحرارية و A4 وقارئ الباركود'],
  ];
  return `
        <section class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-cardbg border border-gray-800 rounded-2xl p-6 space-y-4">
                <h2 class="text-xl font-bold text-white flex items-center gap-2"><i class="fa-solid fa-list-ol acc"></i> خطوات التسطيب</h2>
                <ol class="space-y-3 text-sm text-gray-300">
${steps.map((t, i) => `                    <li class="flex gap-3"><span class="w-7 h-7 rounded-full bg-acc flex items-center justify-center text-xs font-black flex-shrink-0">${i + 1}</span><span class="pt-0.5">${esc(t)}</span></li>`).join('\n')}
                </ol>
            </div>
            <div class="bg-cardbg border border-gray-800 rounded-2xl p-6 space-y-4">
                <h2 class="text-xl font-bold text-white flex items-center gap-2"><i class="fa-solid fa-microchip acc"></i> متطلبات التشغيل</h2>
                <ul class="space-y-2.5 text-sm text-gray-300">
${req.map(([ic, t]) => `                    <li class="flex gap-2"><i class="${ic} acc mt-1"></i> ${esc(t)}</li>`).join('\n')}
                </ul>
            </div>
        </section>

        <section class="space-y-4">
            <h2 class="text-2xl font-bold text-white text-center flex items-center justify-center gap-2"><i class="fa-solid fa-circle-question acc"></i> أسئلة متكررة</h2>
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
                                ${d.badge ? `<span class="text-[10px] md:text-xs px-2 py-0.5 rounded-full font-bold border" style="background:${color}1a;color:${color};border-color:${color}33">${esc(d.badge)}</span>` : ''}
                            </div>
                            ${d.password ? `<div class="flex items-center gap-2 mt-1"><span class="text-xs text-gray-400">الباسورد:</span>
                                <button onclick="copyPassword('${esc(d.password)}')" class="font-mono text-xs px-2 py-0.5 rounded border flex items-center gap-1 transition" style="background:${color}33;color:${color};border-color:${color}55"><strong>${esc(d.password)}</strong><i class="fa-regular fa-copy text-[10px]"></i></button></div>`
    : `<p class="text-xs text-gray-400 mt-1">${esc(d.note || '')}</p>`}
                        </div>
                    </div>
                    <a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer" class="${d.primary ? 'bg-acc' : d.password ? '' : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'} px-4 md:px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-2 flex-shrink-0 active:scale-95 shadow-md" ${d.password ? `style="background:${color};color:#111"` : ''}>
                        <span>تحميل</span><i class="fa-solid fa-download text-xs"></i>
                    </a>
                </div>`;
}

function programPage(p) {
  const base = '../';
  const rel = REL[p.slug];
  if (rel && rel.published) {
    p.downloads = [{ name: 'تحميل مباشر', icon: 'fa-brands fa-github', tone: p.color, badge: 'الرسمي والأسرع', note: `${rel.kind === 'RAR' ? 'ملف RAR' : 'ملف التسطيب'} — ${rel.sizeMB} ميجا · الإصدار ${rel.version}`, url: directUrl(rel), primary: true },
      ...(p.downloads || []).map((d) => ({ ...d, primary: false }))];
  }
  const has = (p.downloads || []).length > 0;
  const ask = wa(D.company.whatsapp, `عايز برنامج ${p.product} (${p.nameAr})`);
  const grid = has ? `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
${p.downloads.map((d, i) => downloadCard(d) + (i === p.downloads.length - 1 && p.downloads.length % 2 ? '' : '')).join('\n')}
            </div>` : `
            <div class="bg-cardbg border border-acc rounded-3xl p-8 text-center space-y-4 glow-effect">
                <div class="w-16 h-16 mx-auto rounded-2xl bg-acc-soft flex items-center justify-center text-3xl"><i class="fa-solid fa-hourglass-half"></i></div>
                <h3 class="text-xl md:text-2xl font-extrabold text-white">روابط التحميل قريبًا</h3>
                <p class="text-gray-400 text-sm max-w-xl mx-auto">البرنامج جاهز ومتاح — اطلبه دلوقتي على الواتساب وهنبعتلك رابط التحميل ونساعدك في التركيب والتفعيل (14 يوم تجربة مجانية).</p>
                <a href="${ask}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 bg-acc px-6 py-3 rounded-xl font-extrabold shadow-lg active:scale-95"><i class="fa-brands fa-whatsapp text-lg"></i> اطلب البرنامج على الواتساب</a>
            </div>`;
  const title = `${p.product} | مركز التحميل الرسمي`;
  return head({ title, desc: p.about, accent: p.color, base, image: `${base}icons/${p.slug}.png` }) + header(base, { back: true }) + `
    <main class="max-w-5xl mx-auto px-4 py-10 w-full space-y-12">
        <section class="text-center space-y-6">
            <div class="relative inline-block">
                <div class="w-32 h-32 md:w-40 md:h-40 mx-auto rounded-3xl ring-grad p-1 shadow-2xl glow-effect">
                    <div class="w-full h-full bg-cardbg rounded-[22px] flex items-center justify-center overflow-hidden p-2">
                        <img src="${base}icons/${p.slug}.png" alt="${esc(p.product)}" class="w-full h-full object-cover rounded-2xl">
                    </div>
                </div>
                <span class="absolute -bottom-2 -right-2 bg-acc text-xs font-black px-3 py-1 rounded-full border-2 border-darkbg flex items-center gap-1 shadow-lg"><i class="fa-solid fa-circle-check text-[10px]"></i> النُسخة الرسمية</span>
            </div>
            <div class="space-y-3">
                <h1 class="text-3xl md:text-5xl font-extrabold text-white tracking-wide" dir="ltr">${esc(p.product)}</h1>
                <p class="text-lg md:text-xl font-bold acc">${esc(p.nameAr)}</p>
                <p class="text-gray-300 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">${esc(p.about)}</p>
            </div>
            <div class="flex flex-wrap justify-center items-center gap-3 pt-2 text-xs md:text-sm text-gray-300">
                <div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid fa-desktop acc"></i><span>النظام: <strong class="text-white">Windows (64-bit)</strong></span></div>
                <div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid ${p.icon} acc"></i><span>التصنيف: <strong class="text-white">${esc(p.category)}</strong></span></div>
                <div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid fa-certificate acc"></i><span><strong class="text-emerald-400">النسخة الرسمية</strong> من Meta Origin</span></div>
                ${rel ? `<div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid fa-code-branch acc"></i><span>الإصدار: <strong class="text-white" dir="ltr">${esc(rel.version)}</strong></span></div>
                <div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid fa-calendar-day acc"></i><span>آخر تحديث: <strong class="text-white">${fmtDay(rel.date)}</strong></span></div>` : ''}
                <div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid fa-language acc"></i><span>اللغة: <strong class="text-white">عربي / English</strong></span></div>
                <div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid fa-gift acc"></i><span><strong class="text-white">14 يوم</strong> تجربة مجانية</span></div>
            </div>
            <div class="flex flex-wrap justify-center gap-3">
                <a href="#downloads" class="inline-flex items-center gap-2 bg-acc px-6 py-3 rounded-xl font-extrabold shadow-lg active:scale-95"><i class="fa-solid fa-download"></i> تحميل البرنامج</a>
                <a href="${esc(p.video || D.company.youtube)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-extrabold shadow-lg active:scale-95"><i class="fa-brands fa-youtube text-lg"></i> ${p.video ? 'شاهد فيديو الشرح' : 'فيديوهات الشرح على اليوتيوب'}</a>
            </div>
        </section>

        <section id="downloads" class="space-y-6">
            <div class="text-center space-y-2">
                <h2 class="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-2"><i class="fa-solid fa-cloud-arrow-down acc"></i><span>${has ? 'سيرفرات التحميل المتاحة' : 'تحميل البرنامج'}</span></h2>
                <p class="text-gray-400 text-xs md:text-sm">${has ? 'اختر المنصة أو السيرفر المفضل لديك لبدء التحميل المباشر' : 'تواصل معنا وهنوصلك البرنامج'}</p>
            </div>${grid}
            ${rel && rel.notes.length ? `<details class="bg-cardbg border border-gray-800 rounded-2xl p-5 group" open>
                <summary class="font-bold text-white cursor-pointer list-none flex justify-between items-center"><span><i class="fa-solid fa-wand-magic-sparkles acc"></i> إيه الجديد في الإصدار <span dir="ltr">${esc(rel.version)}</span></span><i class="fa-solid fa-chevron-down acc text-xs transition group-open:rotate-180"></i></summary>
                <ul class="mt-3 space-y-2 text-sm text-gray-300">${rel.notes.map((n) => `<li class="flex gap-2"><i class="fa-solid fa-check acc mt-1"></i><span>${esc(n)}</span></li>`).join('')}</ul>
            </details>` : ''}
        </section>

        <section class="space-y-8 pt-4">
            <div class="text-center space-y-2">
                <h2 class="text-2xl md:text-3xl font-bold text-white">لماذا <span dir="ltr">${esc(p.product)}</span>؟</h2>
                <p class="text-gray-400 text-xs md:text-sm">مميزات رئيسية تجعل شغلك أسهل وأكثر دقة</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
${p.features.map((f, i) => `                <div class="bg-cardbg border border-gray-800 p-6 rounded-2xl space-y-3 border-t-2" style="border-top-color:${['var(--acc)', '#3b82f6', '#a855f7'][i % 3]}">
                    <div class="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold" style="background:${['rgba(var(--acc-rgb),.12)', 'rgba(59,130,246,.12)', 'rgba(168,85,247,.12)'][i % 3]};color:${['var(--acc)', '#60a5fa', '#c084fc'][i % 3]}"><i class="fa-solid ${f.icon}"></i></div>
                    <h3 class="text-lg font-bold text-white">${esc(f.t)}</h3>
                    <p class="text-gray-400 text-xs leading-relaxed">${esc(f.d)}</p>
                </div>`).join('\n')}
            </div>
        </section>
${p.video ? `
        <section id="video" class="space-y-6">
            <div class="text-center space-y-2">
                <h2 class="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-2"><i class="fa-brands fa-youtube text-red-500"></i><span>فيديو الشرح</span></h2>
                <p class="text-gray-400 text-xs md:text-sm">شرح كامل للبرنامج بالعامية المصرية — <a class="acc underline" href="${esc(D.company.youtube)}" target="_blank" rel="noopener noreferrer">وفيديوهات تانية على القناة</a></p>
            </div>
            <div class="rounded-2xl overflow-hidden border border-gray-800 shadow-2xl aspect-video bg-black">
                <iframe class="w-full h-full" src="https://www.youtube-nocookie.com/embed/${esc(p.video.split('/').pop())}" title="${esc(p.product)}" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
        </section>` : ''}
${gallery(p, base)}
${installAndFaq(p)}
${team(base)}

        <section class="bg-cardbg border border-gray-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl" style="background:linear-gradient(90deg, rgba(var(--acc-rgb),.12), #111827, rgba(37,99,235,.12))">
            <div class="space-y-2 text-center md:text-right">
                <h3 class="text-xl font-extrabold text-white">مشاركة رابط التحميل</h3>
                <p class="text-gray-400 text-xs md:text-sm">يمكنك نسخ رابط هذه الصفحة ومشاركته مع أي عميل فوراً.</p>
            </div>
            <div class="flex items-center gap-3 w-full md:w-auto">
                <button onclick="copyPageLink()" class="w-full md:w-auto bg-acc font-extrabold px-6 py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg active:scale-95 text-sm"><i class="fa-regular fa-copy"></i><span>نسخ رابط الصفحة</span></button>
                <a href="${base}#programs" class="w-full md:w-auto bg-gray-800 hover:bg-gray-700 text-white font-bold px-6 py-3 rounded-xl transition flex items-center justify-center gap-2 border border-gray-700 text-sm"><i class="fa-solid fa-grip"></i><span>كل البرامج</span></a>
            </div>
        </section>
    </main>` + footer(base, p.product);
}

// ---------------- صفحة الشركة ----------------
function homePage() {
  const base = './';
  const cats = Object.entries(D.categories).map(([id, name]) => ({ id, name, items: D.programs.filter((p) => p.cat === id) })).filter((c) => c.items.length);
  const card = (p) => `                <a href="${p.slug}/" data-prog="${esc([p.product, p.nameAr, p.category, p.short].join(' '))}" class="prog-card bg-cardbg border border-gray-800 rounded-2xl p-5 flex gap-4 items-start transition hover:-translate-y-1" style="--c:${p.color}">
                    <img src="icons/${p.slug}.png" alt="" class="w-16 h-16 rounded-2xl flex-shrink-0" loading="lazy">
                    <div class="min-w-0 space-y-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <h3 class="font-extrabold text-white text-base" dir="ltr">${esc(p.product.replace('Meta Origin - ', ''))}</h3>
                            ${p.isNew ? '<span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-400 text-black">جديد</span>' : ''}
                            ${(p.downloads || []).length || REL[p.slug]?.published ? '<span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">متاح للتحميل</span>' : '<span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-700/50 text-gray-300 border border-gray-600">قريبًا</span>'}
                        </div>
                        <div class="text-sm font-bold" style="color:${p.color}">${esc(p.nameAr)}</div>
                        <p class="text-xs text-gray-400 leading-relaxed">${esc(p.short)}</p>
                    </div>
                </a>`;
  return head({ title: 'Meta Origin | برامج إدارة الشركات والمحلات', desc: D.company.about, accent: '#3b82f6', base, image: 'img/company-logo.png' }) + header(base) + `
    <main class="max-w-6xl mx-auto px-4 py-10 w-full space-y-14">
        <section class="text-center space-y-6">
            <img src="img/company-logo.png" alt="Meta Origin" class="w-28 h-28 md:w-32 md:h-32 mx-auto rounded-3xl border border-gray-800 bg-gray-900 p-1 glow-effect">
            <div class="space-y-3">
                <h1 class="text-4xl md:text-6xl font-black text-white tracking-wide">Meta Origin</h1>
                <p class="text-gray-400 font-bold">${esc(D.company.tagline)}</p>
                <p class="text-gray-300 max-w-3xl mx-auto text-sm md:text-base leading-relaxed">${esc(D.company.about)}</p>
            </div>
            <div class="flex flex-wrap justify-center gap-3">
                <a href="#programs" class="bg-acc px-6 py-3 rounded-xl font-extrabold shadow-lg active:scale-95 flex items-center gap-2"><i class="fa-solid fa-grip"></i> تصفّح البرامج</a>
                <a href="${wa(D.company.whatsapp, 'عايز أعرف أكتر عن برامج Meta Origin')}" target="_blank" rel="noopener noreferrer" class="bg-gray-800 hover:bg-gray-700 border border-gray-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2"><i class="fa-brands fa-whatsapp text-emerald-400"></i> كلّمنا واتساب</a>
                <a href="${esc(D.company.youtube)}" target="_blank" rel="noopener noreferrer" class="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"><i class="fa-brands fa-youtube"></i> قناتنا على اليوتيوب</a>
                <a href="${esc(D.company.facebook)}" target="_blank" rel="noopener noreferrer" class="bg-[#1877f2] hover:brightness-110 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"><i class="fa-brands fa-facebook"></i> صفحتنا على الفيسبوك</a>
            </div>
            <div class="flex flex-wrap justify-center gap-3 pt-2 text-xs md:text-sm text-gray-300">
                <div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid fa-layer-group acc"></i><span><strong class="text-white">${D.programs.length}</strong> برنامج</span></div>
                <div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid fa-language acc"></i><span>عربي و English</span></div>
                <div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid fa-network-wired acc"></i><span>جهاز واحد أو شبكة أو أونلاين</span></div>
                <div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid fa-gift acc"></i><span>14 يوم تجربة مجانية</span></div>
                <div class="bg-cardbg border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-2"><i class="fa-solid fa-headset acc"></i><span>دعم فني وتركيب</span></div>
            </div>
        </section>

        <section id="programs" class="space-y-8">
            <div class="text-center space-y-2">
                <h2 class="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-2"><i class="fa-solid fa-grip acc"></i><span>برامجنا</span></h2>
                <p class="text-gray-400 text-xs md:text-sm">اختار البرنامج عشان تشوف تفاصيله وتحمّله</p>
                <div class="max-w-md mx-auto pt-2"><input oninput="filterPrograms(this.value)" placeholder="ابحث عن برنامج (صيدلية، مطعم، مدرسة، مرتبات…)" class="w-full bg-cardbg border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"></div>
            </div>
${cats.map((c) => `            <div data-cat="${c.id}" class="space-y-4">
                <h3 class="text-lg font-extrabold text-gray-200 border-r-4 pr-3" style="border-color:#3b82f6">${esc(c.name)}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
${c.items.map(card).join('\n')}
                </div>
            </div>`).join('\n')}
            <p id="noResult" class="text-center text-gray-400" style="display:none">مفيش برنامج بالاسم ده — <a class="acc underline" href="${wa(D.company.whatsapp, 'محتاج برنامج لنشاطي')}" target="_blank" rel="noopener noreferrer">كلّمنا</a> وهنساعدك.</p>
        </section>

        <section id="why" class="space-y-6">
            <div class="text-center space-y-2">
                <h2 class="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-2"><i class="fa-solid fa-star acc"></i><span>ليه برامج Meta Origin؟</span></h2>
                <p class="text-gray-400 text-xs md:text-sm">حاجات موجودة في كل برامجنا</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
${D.company.strengths.map((x) => `                <div class="bg-cardbg border border-gray-800 p-5 rounded-2xl space-y-2 border-t-2 card-hover" style="border-top-color:${x.color}">
                    <div class="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style="background:${x.color}1f;color:${x.color}"><i class="fa-solid ${x.icon}"></i></div>
                    <h3 class="text-base font-bold text-white">${esc(x.t)}</h3>
                    <p class="text-gray-400 text-xs leading-relaxed">${esc(x.d)}</p>
                </div>`).join('\n')}
            </div>
        </section>
${team(base)}
    </main>` + footer(base, 'Meta Origin');
}

fs.writeFileSync(path.join(HERE, 'index.html'), homePage());
for (const p of D.programs) {
  fs.mkdirSync(path.join(HERE, p.slug), { recursive: true });
  fs.writeFileSync(path.join(HERE, p.slug, 'index.html'), programPage(p));
}
// صفحة 404: أي رابط غلط يرجع للرئيسية
fs.writeFileSync(path.join(HERE, '404.html'), `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=/"><title>Meta Origin</title><a href="/">Meta Origin</a>`);
fs.writeFileSync(path.join(HERE, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[SITE, ...D.programs.map((p) => `${SITE}${p.slug}/`)].map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(HERE, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`);
console.log(`index.html + ${D.programs.length} صفحة برنامج`);
