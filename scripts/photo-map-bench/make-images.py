# 측정용 가짜 사진(3000x2000, 흰 세로줄)을 img/에 만든다. 줄이 흐리게 보이면 사진이 늘어난 것이다.
import os, random
from PIL import Image, ImageDraw
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img')
os.makedirs(out, exist_ok=True)
for i in range(12):
    im = Image.new('RGB', (3000, 2000), (random.randint(40, 220), random.randint(40, 220), random.randint(40, 220)))
    d = ImageDraw.Draw(im)
    for x in range(0, 3000, 100): d.line([(x, 0), (x, 2000)], fill=(255, 255, 255), width=6)
    im.save(os.path.join(out, 'p%d.jpg' % i), quality=90)
    # 새 주소(Cloudflare 줄이기)를 흉내 낼 때 쓰는 크기별 사본
    for w in (120, 320, 640, 1080, 1600):
        im.resize((w, w * 2 // 3)).save(os.path.join(out, 'p%d_w%d.jpg' % (i, w)), quality=70)
