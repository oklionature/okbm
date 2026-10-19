"""정보 글(scripts/guides/*.md) → guide/<slug>/index.html, 목록 guide/index.html.

build-spot-pages.py가 불러서 같이 돌린다(사이트맵·llms.txt에도 넣는다).

원고 형식: 맨 위 --- 사이 머리말(slug, title, h1, description, date, related),
본문은 마크다운 일부만 쓴다 — ## 제목, 문단, - 목록, 1. 목록, | 표 |, ![설명](/guide/img/파일),
[글자](주소), **굵게**, 그리고 "## 자주 묻는 질문" 아래 Q:/A: 줄(FAQ 구조화 정보가 된다).
그림 원본은 scripts/guides/img/에 두면 guide/img/로 복사된다.
"""
import os
import re
import shutil

GUIDE_SRC = "guides"
GUIDE_STYLE = """
.meta{margin:6px 0 0;font-size:.8rem;color:#94a3b8}
.prose h2{margin:30px 0 10px;font-size:1.15rem;color:#f8fafc}
.prose p{margin:10px 0}
.prose ul,.prose ol{margin:10px 0;padding-left:22px}
.prose li{margin:4px 0}
.prose figure{margin:14px 0}
.prose figure img{display:block;width:100%;height:auto;max-height:440px;object-fit:contain;border-radius:12px;background:#111}
.prose figcaption{margin-top:6px;font-size:.78rem;color:#94a3b8}
.prose .tbl td{text-align:left}
.prose .tbl th{text-align:left}
.prose .tbl td:first-child{white-space:nowrap;padding-right:10px}
.prose .tbl td{vertical-align:top;font-size:.84rem;line-height:1.45}
.prose .tblwrap{overflow-x:auto;margin:14px 0}
.prose .tbl caption{caption-side:top;text-align:left;font-size:.85rem;font-weight:700;color:#f8fafc;padding:0 0 8px}
.prose .tbl.calc th,.prose .tbl.calc td{text-align:center;white-space:nowrap;padding:8px 2px}
.prose .tbl caption small{display:block;margin-top:4px;font-weight:400;color:#94a3b8;font-size:.78rem}
.prose .tbl.calc td:first-child{font-weight:700;color:#f8fafc}
.prose .tbl.calc td:not(:first-child){color:#fde047;font-weight:700}
.prose .figs{display:grid;gap:8px;margin:14px 0}
.prose .figs figure{margin:0}
.prose .figs.n2{grid-template-columns:repeat(2,1fr)}
.prose .figs.n3{grid-template-columns:repeat(3,1fr)}
.prose .figs figcaption{text-align:center}
.prose figcaption a{color:#94a3b8}
.prose h3{margin:20px 0 8px;font-size:.98rem;color:#cbd5e1}
.gear{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:10px 0;padding:0;list-style:none}
@media (min-width:560px){.gear{grid-template-columns:repeat(3,1fr)}}
.gear li{display:flex;flex-direction:column;border-radius:12px;overflow:hidden;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1)}
.gear .gi{display:flex;align-items:center;justify-content:center;height:120px;background:#f1f5f9}
.gear .gi img{max-width:86%;max-height:108px;object-fit:contain}
.gear .gt{padding:8px 10px 10px;font-size:.8rem;line-height:1.4}
.gear .gt small{display:block;color:#94a3b8;font-size:.72rem}
.gear .gt b{display:block;color:#f8fafc;font-weight:600}
.gear .gt span{display:block;margin-top:2px;color:#fde047;font-weight:800;font-variant-numeric:tabular-nums}
.total{margin:12px 0;padding:12px 14px;border-radius:12px;background:rgba(253,224,71,.1);border:1px solid rgba(253,224,71,.4);font-weight:800;color:#fde047;text-align:right}
.yt{margin:18px auto 6px;max-width:320px}
.yt iframe{display:block;width:100%;aspect-ratio:9/16;border:0;border-radius:14px;background:#111}
.vlinks{display:flex;justify-content:center;flex-wrap:wrap;gap:8px;margin:8px 0 18px;font-size:.84rem}
.vlinks a{padding:5px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.18);color:#e2e8f0;text-decoration:none}
.reel{display:flex;align-items:center;gap:14px;margin:18px 0;padding:10px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(253,224,71,.35);text-decoration:none;color:#e2e8f0}
.reel .rt{position:relative;flex:none;width:96px;aspect-ratio:9/16;border-radius:10px;overflow:hidden;background:#111}
.reel .rt img{width:100%;height:100%;object-fit:cover;display:block}
.reel .rt span{position:absolute;left:50%;top:50%;width:38px;height:38px;margin:-19px 0 0 -19px;border-radius:50%;background:rgba(0,0,0,.55);border:2px solid #fff}
.reel .rt span::after{content:"";position:absolute;left:14px;top:10px;border-style:solid;border-width:8px 0 8px 13px;border-color:transparent transparent transparent #fff}
.reel b{display:block;color:#f8fafc;font-size:.98rem;line-height:1.4}
.reel small{display:block;margin-top:4px;color:#94a3b8;font-size:.8rem}
.reel em{display:inline-block;margin-top:8px;padding:4px 10px;border-radius:999px;background:#fde047;color:#111;font-style:normal;font-weight:800;font-size:.8rem}
"""


def parse(path):
    raw = open(path, encoding="utf-8").read()
    _, head, body = raw.split("---", 2)
    meta = {}
    for line in head.strip().splitlines():
        k, _, v = line.partition(":")
        meta[k.strip()] = v.strip()
    return meta, body.strip()


def inline(b, text):
    s = b.esc(text)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = s.replace("&lt;br&gt;", "<br>")
    return re.sub(r"\[([^\]]+)\]\((/[^)\s]*|#[\w-]+|https://[^)\s]+)\)", r'<a href="\2">\1</a>', s)


IMG_RE = re.compile(r'!\[([^\]]*)\]\(([^)\s]+)(?:\s+"(.*)")?\)')


def figure(b, m):
    cap = f"<figcaption>{inline(b, m.group(3))}</figcaption>" if m.group(3) else ""
    return f'<figure><img src="{b.esc(m.group(2))}" alt="{b.esc(m.group(1))}" loading="lazy">{cap}</figure>'


def video_block(b, meta, again=False):
    """유튜브가 있으면 글 속에서 바로 재생, 아래에 유튜브·인스타 링크. 없으면 인스타 카드."""
    yt = meta.get("youtube")
    if not yt:
        return reel_card(b, meta, again)
    links = [(f"https://www.youtube.com/shorts/{yt}", "유튜브에서 보기")]
    if meta.get("reel"):
        links.append((meta["reel"], "인스타그램에서 보기"))
    link_html = '<p class="vlinks">' + "".join(
        f'<a href="{b.esc(h)}" target="_blank" rel="noopener">{b.esc(t)}</a>' for h, t in links) + "</p>"
    if again:
        return f'<h2>영상으로 다시 보기</h2>{link_html}'
    return (f'<div class="yt"><iframe src="https://www.youtube-nocookie.com/embed/{b.esc(yt)}" '
            f'title="{b.esc(meta.get("reel_title", "영상"))}" loading="lazy" '
            f'allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>{link_html}')


def reel_card(b, meta, again=False):
    if not meta.get("reel"):
        return ""
    head = "영상으로 다시 보기" if again else meta.get("reel_title", "영상으로 보기")
    return (f'<a class="reel" href="{b.esc(meta["reel"])}" target="_blank" rel="noopener">'
            f'<span class="rt"><img src="{b.esc(meta.get("reel_thumb", ""))}" alt="" loading="lazy"><span></span></span>'
            f'<span><b>{b.esc(head)}</b><small>인스타그램 릴스 · {b.esc(meta.get("reel_len", ""))}</small>'
            f'<em>영상 보기</em></span></a>')


def render_body(b, body):
    """마크다운 일부 → (HTML, FAQ 목록). 첫 문단은 요약 문단(answer)으로 쓴다."""
    out, faqs = [], []
    first_p = True
    in_faq = False
    flushed = 0

    def flush_faq():
        nonlocal flushed
        if len(faqs) > flushed:
            out.append('<dl class="faq">' + "".join(
                f"<dt>{b.esc(q)}</dt><dd>{b.esc(a)}</dd>" for q, a in faqs[flushed:]) + "</dl>")
            flushed = len(faqs)

    for block in re.split(r"\n\s*\n", body):
        lines = [ln.rstrip() for ln in block.strip().splitlines() if ln.strip()]
        if not lines:
            continue
        head = lines[0]
        if head.startswith("### "):
            out.append(f"<h3>{b.esc(head[4:].strip())}</h3>")
            lines = lines[1:]
            if not lines:
                continue
            head = lines[0]
        if head.startswith("@ "):
            cards = []
            for ln in lines:
                kind, name, price, img = [x.strip() for x in ln[2:].split("|")]
                cards.append(f'<li><span class="gi"><img src="{b.esc(img)}" alt="{b.esc(name)}" loading="lazy"></span>'
                             f'<span class="gt"><small>{b.esc(kind)}</small><b>{b.esc(name)}</b><span>{b.esc(price)}</span></span></li>')
            out.append('<ul class="gear">' + "".join(cards) + "</ul>")
            continue
        if head.startswith("= "):
            out.append(f'<p class="total">{inline(b, head[2:].strip())}</p>')
            continue
        if head.startswith("## "):
            title = head[3:].strip()
            flush_faq()
            in_faq = title == "자주 묻는 질문"
            out.append(f"<h2>{b.esc(title)}</h2>")
            lines = lines[1:]
            if not lines:
                continue
            head = lines[0]
        if in_faq and head.startswith("Q:"):
            q = head[2:].strip()
            a = " ".join(ln[2:].strip() if ln.startswith("A:") else ln.strip() for ln in lines[1:])
            faqs.append((q, a))
            continue
        if head.startswith("<"):
            out.append("\n".join(lines))
            continue
        figs = [IMG_RE.fullmatch(ln) for ln in lines]
        if all(figs):
            html_figs = "".join(figure(b, f) for f in figs)
            out.append(html_figs if len(figs) == 1 else f'<div class="figs n{min(len(figs), 3)}">{html_figs}</div>')
            continue
        if head.startswith("|"):
            rows = [[c.strip() for c in ln.strip("|").split("|")] for ln in lines if not re.fullmatch(r"\|[\s:|-]+\|", ln)]
            th = "".join(f"<th>{inline(b, c)}</th>" for c in rows[0])
            tds = "".join("<tr>" + "".join(f"<td>{inline(b, c)}</td>" for c in r) + "</tr>" for r in rows[1:])
            out.append(f'<table class="tbl"><thead><tr>{th}</tr></thead><tbody>{tds}</tbody></table>')
            continue
        if re.match(r"\d+\. ", head):
            items = [inline(b, re.sub(r"^\d+\. ", "", ln)) for ln in lines]
            out.append("<ol>" + "".join(f"<li>{x}</li>" for x in items) + "</ol>")
            continue
        if head.startswith("- "):
            out.append("<ul>" + "".join(f"<li>{inline(b, ln[2:])}</li>" for ln in lines) + "</ul>")
            continue
        text = " ".join(lines)
        out.append(f'<p class="answer">{inline(b, text)}</p>' if first_p else f"<p>{inline(b, text)}</p>")
        first_p = False
    flush_faq()
    return "\n".join(out), faqs


def first_paragraph(body):
    for block in re.split(r"\n\s*\n", body):
        t = block.strip()
        if t and not t.startswith(("#", "!", "|", "-")) and not re.match(r"\d+\. ", t):
            return " ".join(t.split())
    return ""


def guide_page(b, meta, body):
    slug = meta["slug"]
    page_url = f"{b.SITE}/guide/{slug}/"
    html_body, faqs = render_body(b, body)
    card = video_block(b, meta)
    if card:
        # 요약 문단 바로 아래에 영상 카드, 글 끝에 한 번 더
        html_body = html_body.replace("</p>", "</p>\n" + card, 1)
    desc = meta.get("description") or b.short_desc(first_paragraph(body))
    imgs = re.findall(r"!\[[^\]]*\]\((/[^)\s]+)", body)
    related = [x.strip() for x in meta.get("related", "").split("|") if x.strip()]
    rel_links = [(r.split(" ", 1)[0], r.split(" ", 1)[1] if " " in r else r) for r in related]
    ld_article = {"@context": "https://schema.org", "@type": "Article", "headline": meta.get("h1") or meta["title"],
                  "description": desc, "url": page_url, "inLanguage": "ko-KR",
                  "datePublished": meta.get("date"), "dateModified": meta.get("updated") or meta.get("date"),
                  "author": {"@type": "Organization", "name": "낭만루트", "url": f"{b.SITE}/"},
                  "publisher": {"@type": "Organization", "name": "낭만루트",
                                "logo": {"@type": "ImageObject", "url": f"{b.SITE}/logo.png"}}}
    if imgs:
        ld_article["image"] = [b.SITE + i for i in imgs]
    ld_crumb = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "낭만루트", "item": f"{b.SITE}/"},
        {"@type": "ListItem", "position": 2, "name": "백패킹 가이드", "item": f"{b.SITE}/guide/"},
        {"@type": "ListItem", "position": 3, "name": meta.get("h1") or meta["title"], "item": page_url}]}
    lds = [ld_article, ld_crumb]
    if meta.get("youtube"):
        yt = meta["youtube"]
        lds.append({"@context": "https://schema.org", "@type": "VideoObject",
                    "name": meta.get("reel_title") or meta.get("h1"), "description": desc,
                    "thumbnailUrl": f"https://i.ytimg.com/vi/{yt}/hqdefault.jpg",
                    "uploadDate": meta.get("youtube_date") or meta.get("date"),
                    "embedUrl": f"https://www.youtube.com/embed/{yt}",
                    "contentUrl": f"https://www.youtube.com/shorts/{yt}"})
    if faqs:
        lds.append({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faqs]})
    og_img = b.SITE + imgs[0] if imgs else f"{b.SITE}/fulllogoblk.png?v=20260919_v3"
    title = f"{meta['title']} | 낭만루트"
    return f"""<!doctype html>
<html lang="ko">
<head>
{b.GENERATED_MARK}
{b.HEAD_COMMON}
<title>{b.esc(title)}</title>
<meta name="description" content="{b.esc(desc)}">
<link rel="canonical" href="{page_url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="낭만루트">
<meta property="og:locale" content="ko_KR">
<meta property="og:url" content="{page_url}">
<meta property="og:title" content="{b.esc(title)}">
<meta property="og:description" content="{b.esc(desc)}">
<meta property="og:image" content="{b.esc(og_img)}">
<meta name="twitter:card" content="summary_large_image">
{"".join(f'<script type="application/ld+json">{b.json_ld(x)}</script>' for x in lds)}
<style>{b.STYLE}{GUIDE_STYLE}</style>
</head>
<body>
<div class="wrap">
<a class="top" href="/"><img src="/logo.png" alt="" width="28" height="28">낭만루트</a>
<nav class="crumb" aria-label="현재 위치"><a href="/guide/">백패킹 가이드</a> › {b.esc(meta.get("h1") or meta["title"])}</nav>
<main>
<article class="prose">
<h1>{b.esc(meta.get("h1") or meta["title"])}</h1>
<p class="meta">낭만루트 · {b.esc(meta.get("updated") or meta.get("date") or "")}</p>
{html_body}
{video_block(b, meta, again=True)}
</article>
{b.chips(rel_links) if rel_links else ""}
<a class="cta" href="{b.SITE}/map.html">낭만루트 지도에서 박지 찾기</a>
</main>
{b.FOOTER}
</div>
</body>
</html>
"""


def guide_index(b, guides):
    items = "".join(
        f'<li><a href="/guide/{b.esc(m["slug"])}/">{b.esc(m.get("h1") or m["title"])}'
        f'<small>{b.esc(m.get("description", ""))}</small></a></li>' for m in guides)
    title = "백패킹 가이드 | 낭만루트"
    desc = "백패킹 장비 고르는 법과 산에서 하룻밤을 보내는 요령을 정리한 낭만루트 가이드예요."
    return f"""<!doctype html>
<html lang="ko">
<head>
{b.GENERATED_MARK}
{b.HEAD_COMMON}
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{b.SITE}/guide/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="낭만루트">
<meta property="og:url" content="{b.SITE}/guide/">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{b.SITE}/fulllogoblk.png?v=20260919_v3">
<style>{b.STYLE}</style>
</head>
<body>
<div class="wrap">
<a class="top" href="/"><img src="/logo.png" alt="" width="28" height="28">낭만루트</a>
<main>
<h1 style="margin-top:18px">백패킹 가이드</h1>
<p class="sub">{desc}</p>
<ul class="related" style="margin-top:16px;grid-template-columns:1fr">{items}</ul>
{b.chips([("/spot/", "전국 백패킹 박지"), ("/stats/", "전국 박지 통계"), ("/theme/beginner/", "초보 백패킹")])}
</main>
{b.FOOTER}
</div>
</body>
</html>
"""


def build(b, dry):
    """정보 글 페이지를 만들고 [(slug, meta)]를 최신순으로 돌려준다."""
    src = os.path.join(b.ROOT, "scripts", GUIDE_SRC)
    out = os.path.join(b.ROOT, "guide")
    if not os.path.isdir(src):
        return []
    guides = []
    for name in sorted(os.listdir(src)):
        if not name.endswith(".md"):
            continue
        meta, body = parse(os.path.join(src, name))
        if meta.get("draft") == "true":
            continue
        b.write(os.path.join(out, meta["slug"], "index.html"), guide_page(b, meta, body), dry)
        guides.append(meta)
    guides.sort(key=lambda m: m.get("updated") or m.get("date") or "", reverse=True)
    if guides:
        b.write(os.path.join(out, "index.html"), guide_index(b, guides), dry)
    img_src = os.path.join(src, "img")
    if os.path.isdir(img_src) and not dry:
        os.makedirs(os.path.join(out, "img"), exist_ok=True)
        keep = set(os.listdir(img_src))
        for f in os.listdir(os.path.join(out, "img")):
            if f not in keep:
                os.remove(os.path.join(out, "img", f))
        for f in os.listdir(img_src):
            dst = os.path.join(out, "img", f)
            if not os.path.exists(dst) or os.path.getsize(dst) != os.path.getsize(os.path.join(img_src, f)):
                shutil.copyfile(os.path.join(img_src, f), dst)
    return guides
