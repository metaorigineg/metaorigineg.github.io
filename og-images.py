# صورة المشاركة (og:image 1200×630) لكل برنامج من صور الدعاية (tools/promo) ← img/og/<slug>.jpg
#   python og-images.py   (بعد make-promo.mjs)
import json, os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
END = os.path.join(HERE, '..', 'Program End')
MAP = {'pharmacy': 'Pharmacy', 'sales-erp': 'Sales ERP', 'clinic': 'Clinic', 'school': 'School', 'erp': 'ERP System', 'acc': 'Acc', 'acc-new': 'Acc New',
       'stores': 'Stores', 'hotel': 'Hotel', 'hotel-pro': 'Hotel Pro', 'cashier': 'Cashier', 'cashier-stores': 'Cashier Stores', 'cashier-lite': 'Cashier Lite',
       'cashier-clothes': 'Cashier Clothes', 'restaurant': 'Restaurant', 'restaurant-pos': 'Restaurant POS', 'hr': 'HR', 'hr-pro': 'HR Pro', 'hr-enterprise': 'HR Enterprise'}
out = os.path.join(HERE, 'img', 'og'); os.makedirs(out, exist_ok=True)
for slug, name in MAP.items():
    d = os.path.join(END, 'Meta Origin - ' + name, 'صور الدعاية', 'عريض 1200×630')
    src = os.path.join(d, '01 - تعريف بالبرنامج.png')
    if not os.path.exists(src):
        print('مفيش صورة:', slug); continue
    Image.open(src).convert('RGB').save(os.path.join(out, slug + '.jpg'), quality=86, optimize=True)
    print('ok', slug, os.path.getsize(os.path.join(out, slug + '.jpg')) // 1024, 'KB')
