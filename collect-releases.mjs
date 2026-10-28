// بيجمع لكل برنامج: ملف المعالج الجاهز في Program End (الإصدار، التاريخ، الحجم) + ملاحظات «إيه الجديد» لنفس الإصدار ← releases.json
//   node collect-releases.mjs
// الملاحظات من tools/shared/whats-new/whats-new.js، من غير السطور اللي بتتكلم عن حاجات لسه مش شغالة (التفعيل أونلاين).
// asset = اسم الملف على GitHub Releases (من غير مسافات)، و published بيتحط true بعد ما الملف يترفع فعلًا.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const END = path.join(ROOT, 'Program End');
const D = JSON.parse(fs.readFileSync(path.join(HERE, 'programs.json'), 'utf8'));
const OUT = path.join(HERE, 'releases.json');
const old = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
// slug الموقع ← فولدر Program End + مفتاح whats-new
const MAP = {
  pharmacy: ['Meta Origin - Pharmacy', 'pharmacy'], 'sales-erp': ['Meta Origin - Sales ERP', 'saleserp'], clinic: ['Meta Origin - Clinic', 'clinic'],
  school: ['Meta Origin - School', 'school'], erp: ['Meta Origin - ERP System', 'erp'], acc: ['Meta Origin - Acc', 'acc'], 'acc-new': ['Meta Origin - Acc New', 'accnew'],
  stores: ['Meta Origin - Stores', 'stores'], hotel: ['Meta Origin - Hotel', 'hotel'], 'hotel-pro': ['Meta Origin - Hotel Pro', 'hotelpro'], cashier: ['Meta Origin - Cashier', 'cashier'],
  'cashier-stores': ['Meta Origin - Cashier Stores', 'kashier'], 'cashier-lite': ['Meta Origin - Cashier Lite', 'cashierlite'], 'cashier-clothes': ['Meta Origin - Cashier Clothes', 'clothes'],
  restaurant: ['Meta Origin - Restaurant', 'restaurant'], hr: ['Meta Origin - HR', 'hr'], 'hr-pro': ['Meta Origin - HR Pro', 'hrpro'], 'hr-enterprise': ['Meta Origin - HR Enterprise', 'hrenterprise'],
};
const NOT_LIVE = /$^/; // سيرفر التراخيص الأونلاين شغال من 2026-10-20 — مفيش حاجة تتخبّى

// ملاحظات whats-new (الملف مكتوب للمتصفح: بنشغّله في بيئة وهمية ونطلّع NOTES)
let NOTES = {};
try {
  const src = fs.readFileSync(path.join(ROOT, 'tools', 'shared', 'whats-new', 'whats-new.js'), 'utf8').replace(/var NOTES = \{/, 'var NOTES = globalThis.__NOTES = {');
  const noop = () => null;
  const ctx = { console, setTimeout: noop, localStorage: { getItem: noop, setItem: noop },
    document: { addEventListener: noop, querySelector: noop, readyState: 'loading', createElement: () => ({ style: {}, appendChild: noop, setAttribute: noop }), head: { appendChild: noop }, body: { appendChild: noop } } };
  ctx.globalThis = ctx; ctx.window = ctx;
  vm.runInNewContext(src, ctx);
  NOTES = ctx.__NOTES || {};
} catch (e) { console.log('whats-new:', e.message); }

const ver = (file) => execFileSync('powershell', ['-NoProfile', '-Command', `(Get-Item -LiteralPath '${file.replace(/'/g, "''")}').VersionInfo.ProductVersion`], { encoding: 'utf8' }).trim().replace(/\+.*$/, '');
const out = {};
for (const p of D.programs) {
  const [dir, key] = MAP[p.slug] || [];
  const file = dir && path.join(END, dir, `${dir} Setup.exe`);
  if (!file || !fs.existsSync(file)) { console.log('مفيش معالج:', p.slug); continue; }
  const version = ver(file);
  let notes = ((NOTES[key] || {})[version] || []).filter((x) => !NOT_LIVE.test(x));
  // HR و HR Enterprise ليهم «إيه الجديد» لوحدهم في services/changelog.py
  const SRC = { hr: 'Meta Origin - HR', 'hr-enterprise': 'Meta Origin - HR SQL Server' }[p.slug];
  const cl = SRC && path.join(ROOT, SRC, 'services', 'changelog.py');
  if (!notes.length && cl && fs.existsSync(cl)) {
    const m = fs.readFileSync(cl, 'utf8').match(new RegExp(`\\('${version.replace(/\./g, '\\.')}',[^\\[]*\\[([\\s\\S]*?)\\]\\),`));
    if (m) notes = [...m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((x) => x[1]).filter((x) => !NOT_LIVE.test(x));
  }
  // الملف اللي بيترفع: الـ RAR اللي صاحب البرامج بيعمله جوّه فولدر البرنامج (نفس اللي على مواقع الرفع التانية)، وإلا المعالج نفسه
  const rar = path.join(END, dir, `${dir}.rar`);
  const up = fs.existsSync(rar) ? rar : file;
  const st = fs.statSync(up);
  const ext = path.extname(up);
  const asset = `${dir.replace(/\s+-\s+/g, '-').replace(/\s+/g, '-')}-${version}${ext === '.exe' ? '-Setup' : ''}${ext}`;
  const prev = old[p.slug] || {};
  out[p.slug] = { version, date: fs.statSync(file).mtime.toLocaleDateString('en-CA'), sizeMB: Math.round(st.size / 1048576), file: up, kind: ext.slice(1).toUpperCase(), asset, tag: `${p.slug}-v${version}`,
    notes, published: !!prev.published && prev.version === version && prev.asset === asset };
  console.log(p.slug.padEnd(16), version.padEnd(8), out[p.slug].date, `${out[p.slug].sizeMB} MB`, notes.length ? `${notes.length} ملاحظة` : '', out[p.slug].published ? 'مرفوع' : '');
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
