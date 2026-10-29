# -*- coding: utf-8 -*-
"""صور البرامج في الموقع (shots/<slug>/N.webp) من صور الشرح الأصلية (<البرنامج>/help/shots/*.png) بمقاسها الكامل وجودة عالية.
   python site_shots.py [<slug>...]     (من غير أسماء = كل البرامج اللي في shots.json)
كل صورة في shots.json ليها عنوان = عنوان شاشة في help.json ← أول صورة للشاشة دي. اللي مالهاش أصل بتفضل زي ما هي (والسكريبت بيقول).
قبل كده الصور كانت 1280×800 مضغوطة جامد (~30 كيلو) فكانت بتتكسّر لما تتكبّر.
"""
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
WS = os.path.dirname(HERE)
# slug الموقع ← فولدر البرنامج (اللي فيه help/)
DIRS = {
    'pharmacy': 'Meta Origin - Pharmacy', 'sales-erp': 'Meta Origin - Sales ERP', 'clinic': 'Meta Origin - Clinic', 'school': 'Meta Origin - School',
    'erp': 'Meta Origin - ERP System', 'acc': 'Meta Origin - Acc', 'acc-new': 'Meta Origin - Acc New', 'stores': 'Meta Origin - Stores',
    'hotel': 'Meta Origin - Hotel', 'hotel-pro': 'Meta Origin - Hotel Pro', 'cashier': 'Meta Origin - Cashier', 'cashier-stores': 'Meta Origin - Cashier Stores',
    'cashier-lite': 'Meta Origin - Cashier Lite', 'cashier-clothes': 'Meta Origin - Cashier Clothes', 'restaurant': 'Meta Origin - Restaurant',
    'hr': 'Meta Origin - HR', 'hr-pro': 'Meta Origin - HR Pro', 'hr-enterprise': 'Meta Origin - HR SQL Server',
}
MAX_W = 2560  # أكبر من كده مالوش لازمة على الشاشات (والملف بيكبر)
QUALITY = 92

shots = json.load(open(os.path.join(HERE, 'shots.json'), encoding='utf-8'))
want = sys.argv[1:] or list(shots)
total_old = total_new = 0
for slug in want:
    if slug not in DIRS:
        print(f'?? {slug}: مش معروف فولدره')
        continue
    help_dir = os.path.join(WS, DIRS[slug], 'help')
    try:
        h = json.load(open(os.path.join(help_dir, 'help.json'), encoding='utf-8'))
    except OSError:
        print(f'?? {slug}: مفيش help.json')
        continue
    screens = [s for c in h.get('chapters', []) for s in c.get('screens', [])]
    by_title = {s.get('title'): s for s in screens}
    missing = []
    for x in shots[slug]:
        s = by_title.get(x['t'])
        src = os.path.join(help_dir, 'shots', s['shots'][0]) if s and s.get('shots') else None
        if not src or not os.path.exists(src):
            missing.append(x['t'])
            continue
        dest = os.path.join(HERE, x['f'])
        old = os.path.getsize(dest) if os.path.exists(dest) else 0
        im = Image.open(src).convert('RGB')
        if im.width > MAX_W:
            im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        im.save(dest, 'WEBP', quality=QUALITY, method=6)
        total_old += old
        total_new += os.path.getsize(dest)
    print(f'{"✓" if not missing else "~"} {slug}: {len(shots[slug]) - len(missing)}/{len(shots[slug])}' + (f' — مالقيتش: {", ".join(missing)}' if missing else ''))
print(f'الحجم: {total_old // 1024} كيلو ← {total_new // 1024} كيلو')
