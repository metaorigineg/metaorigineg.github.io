// ملف التصميم الجاهز للموقع (assets/site.css) بدل Tailwind CDN اللي كان بيبني الشكل جوّه متصفح الزائر (أبطأ في أول فتحة).
// بيقرا كل صفحات HTML اللي build.mjs عملها ويطلّع الـ classes المستخدمة بس، مضغوطة.
//   node build-css.mjs   (build.mjs بيشغّله لوحده في الآخر)
// Tailwind 4 من node_modules بتاع Cashier Clothes (مش بنزّل حاجة) — لو مش موجود، الملف القديم بيفضل زي ما هو.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TW = path.join(HERE, '..', 'Meta Origin - Cashier Clothes', 'node_modules');
const OUT = path.join(HERE, 'assets', 'site.css');

export async function buildCss() {
  const req = createRequire(path.join(TW, 'x.js'));
  let node, oxide;
  try { node = req('@tailwindcss/node'); oxide = req('@tailwindcss/oxide'); } catch (e) {
    console.log('Tailwind مش موجود (هستخدم assets/site.css القديم):', e.message); return false;
  }
  // نفس إعدادات الموقع القديمة: ليلي بالـ class، الألوان darkbg/cardbg، خط Cairo — + توافق مع شكل Tailwind 3 اللي الصفحات اتعملت عليه
  const input = `@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
@theme {
  --color-darkbg: #0b0f19;
  --color-cardbg: #111827;
  --font-sans: 'Cairo', sans-serif;
  /* ألوان Tailwind 3 بالظبط (4 بقت oklch وفيها فرق خفيف) — العائلات اللي الموقع بيستخدمها */
  --color-gray-50: #f9fafb; --color-gray-100: #f3f4f6; --color-gray-200: #e5e7eb; --color-gray-300: #d1d5db; --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280; --color-gray-600: #4b5563; --color-gray-700: #374151; --color-gray-800: #1f2937; --color-gray-900: #111827; --color-gray-950: #030712;
  --color-emerald-300: #6ee7b7; --color-emerald-400: #34d399; --color-emerald-500: #10b981; --color-emerald-600: #059669;
  --color-red-400: #f87171; --color-red-500: #ef4444; --color-red-600: #dc2626;
  --color-sky-300: #7dd3fc; --color-sky-400: #38bdf8; --color-sky-500: #0ea5e9;
  --color-pink-400: #f472b6; --color-pink-500: #ec4899;
  --color-amber-300: #fcd34d; --color-amber-400: #fbbf24; --color-amber-500: #f59e0b;
  --color-blue-400: #60a5fa; --color-blue-500: #3b82f6; --color-blue-600: #2563eb;
}
@layer base {
  *, ::after, ::before, ::backdrop, ::file-selector-button { border-color: var(--color-gray-200, currentColor); }
  button:not(:disabled), [role="button"]:not(:disabled) { cursor: pointer; }
  input::placeholder, textarea::placeholder { color: var(--color-gray-400); }
}
`;
  const compiler = await node.compile(input, { base: TW, onDependency: () => {} });
  const scanner = new oxide.Scanner({ sources: [{ base: HERE, pattern: '**/*.html', negated: false }] });
  const candidates = scanner.scan().filter(Boolean);
  let css = compiler.build(candidates);
  css = node.optimize(css, { minify: true }).code;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, css);
  console.log(`assets/site.css: ${Math.round(css.length / 1024)} KB (${candidates.length} class)`);
  return true;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildCss();
