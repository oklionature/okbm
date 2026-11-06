#!/usr/bin/env python3
"""홈 '낭만! 크리에이터의 그 장소' 줄을 매주 바꾼다 (대표님 11-06).

- 지난 7일 동안 크리에이터 등록(spot_creator_links)에 유튜브를 많이 올린 순 4명을 뽑는다.
  같으면 그 주 인스타·블로그까지 합친 수, 그다음 최근에 올린 사람이 앞.
- 사람마다 그 주에 올린 가장 최근 유튜브 하나를 featured_videos 맨 앞(sort_order 1~4)에 둔다.
  지난 주 크리에이터 영상은 뒤로 밀고, 크리에이터 영상이 12개를 넘으면 오래된 것부터 숨긴다(지우지 않음).
  운영팀이 넣은 영상(creator 빈칸)은 늘 그 뒤에 둔다.
- 박지는 spot_id로 잇고, 채널 이름·사진·소개글은 유튜브에서 가져온다(못 가져오면 이름만).
- 뽑힌 사람에게 감사 알림을, 관리자에게 이번 주 요약 알림을 보낸다.
- 그 주 등록이 없으면 줄은 그대로 두고 관리자에게만 알린다. 야영 금지 박지 영상은 뺀다.

실행: SUPABASE_URL, SUPABASE_SECRET_KEY 환경 변수. --dry-run 이면 무엇을 할지만 출력한다.
"""
import html
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

DRY = "--dry-run" in sys.argv
TOP_N = 4
MAX_CREATOR_ROWS = 12
KST = timezone(timedelta(hours=9))
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"

URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_SECRET_KEY", "")
if not URL or not KEY:
    sys.exit("SUPABASE_URL, SUPABASE_SECRET_KEY 가 필요해요")


def rest(method, path, body=None, prefer=None):
    headers = {"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json"}
    if prefer:
        headers["Prefer"] = prefer
    data = json.dumps(body, ensure_ascii=False).encode() if body is not None else None
    req = urllib.request.Request(URL + "/rest/v1/" + path, data=data, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as res:
        raw = res.read().decode()
        return json.loads(raw) if raw else None


def write(method, path, body=None, prefer="return=minimal"):
    if DRY:
        print("  [미리보기]", method, path, json.dumps(body, ensure_ascii=False)[:160] if body else "")
        return None
    return rest(method, path, body, prefer=prefer)


def notify(row):
    # 같은 주에 다시 돌려도 알림이 두 번 가지 않게 같은 id는 건너뛴다
    write("POST", "user_notifications?on_conflict=id", row, prefer="resolution=ignore-duplicates,return=minimal")


def get_text(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9"})
    with urllib.request.urlopen(req, timeout=20) as res:
        return res.read().decode("utf-8", "ignore")


def youtube_id(url):
    m = re.search(r"(?:youtu\.be/|[?&]v=|/shorts/|/live/)([A-Za-z0-9_-]{11})", url or "")
    return m.group(1) if m else ""


def video_info(vid):
    """영상 제목·채널 이름·채널 주소 (oEmbed)."""
    try:
        d = json.loads(get_text("https://www.youtube.com/oembed?format=json&url=" + urllib.parse.quote("https://youtu.be/" + vid)))
        return d.get("title", ""), d.get("author_name", ""), d.get("author_url", "")
    except Exception as e:
        print("  oEmbed 실패", vid, e)
        return "", "", ""


def channel_info(author_url):
    """채널 사진·소개글·고정 주소. 유튜브가 막으면 빈칸."""
    try:
        t = get_text(author_url)
    except Exception as e:
        print("  채널 페이지 실패", author_url, e)
        return "", "", author_url

    def meta(p):
        m = re.search(p, t)
        return html.unescape(m.group(1)) if m else ""

    img = meta(r'<meta property="og:image" content="([^"]*)"')
    canon = meta(r'<link rel="canonical" href="([^"]*)"') or author_url
    desc = ""
    m = re.search(r'"channelMetadataRenderer":\{"title":"[^"]*","description":"((?:[^"\\]|\\.)*)"', t)
    if m:
        try:
            desc = json.loads('"' + m.group(1) + '"')
        except Exception:
            desc = ""
    if not desc:
        desc = meta(r'<meta property="og:description" content="([^"]*)"')
    return img, desc.strip(), canon


def main():
    now = datetime.now(timezone.utc)
    since = (now - timedelta(days=7)).isoformat()
    week = now.astimezone(KST).strftime("%Y%m%d")

    links = rest("GET", "spot_creator_links?select=id,spot_id,url,kind,title,user_id,author,created_at"
                 "&hidden=is.false&created_at=gte." + urllib.parse.quote(since) + "&order=created_at.desc&limit=5000") or []
    banned = {s["id"] for s in (rest("GET", "spots?select=id&camp_status=eq.banned&limit=5000") or [])}
    links = [l for l in links if str(l["spot_id"]) not in banned]

    people = {}
    for l in links:
        p = people.setdefault(l["user_id"], {"yt": [], "all": 0, "author": l["author"], "last": l["created_at"]})
        p["all"] += 1
        if l["kind"] == "yt" and youtube_id(l["url"]):
            p["yt"].append(l)  # 최근 순으로 쌓인다
    # 유튜브 수 → 그 주 전체 등록 수 → 최근에 올린 사람 순
    ranked = sorted([(u, p) for u, p in people.items() if p["yt"]],
                    key=lambda x: (-len(x[1]["yt"]), -x[1]["all"], -datetime.fromisoformat(x[1]["yt"][0]["created_at"]).timestamp()))
    top = ranked[:TOP_N]

    admins = [u["id"] for u in (rest("GET", "users?select=id&is_admin=is.true") or [])]

    if not top:
        print("지난 7일 유튜브 등록이 없어 줄을 그대로 둬요")
        for a in admins:
            notify({
                "id": "adm_creator_weekly_" + week + "_" + a[:60], "user_id": a, "kind": "admin_creator_weekly",
                "title": "이번 주 크리에이터의 그 장소: 바뀐 영상 없음",
                "body": "지난 7일 동안 크리에이터 유튜브 등록이 없어 '낭만! 크리에이터의 그 장소' 줄을 그대로 뒀어요.",
                "related_id": "", "related_spot_id": "", "related_spot_name": "", "is_read": False})
        return

    rows = rest("GET", "featured_videos?select=id,video_id,creator,sort_order,is_active&order=sort_order.asc,id.asc") or []
    spot_ids = ",".join(sorted({str(p["yt"][0]["spot_id"]) for _, p in top}))
    spots = {str(s["id"]): s for s in (rest("GET", "spots?select=id,spot_main&id=in.(" + spot_ids + ")") or [])}

    picks = []
    for rank, (uid, p) in enumerate(top, 1):
        link = p["yt"][0]
        vid = youtube_id(link["url"])
        spot = spots.get(str(link["spot_id"]), {})
        spot_name = spot.get("spot_main") or ""
        title, ch_name, author_url = video_info(vid)
        img, desc, ch_url = channel_info(author_url) if author_url else ("", "", "")
        picks.append({"rank": rank, "uid": uid, "author": p["author"], "count": len(p["yt"]), "vid": vid,
                      "spot_id": str(link["spot_id"]), "spot_name": spot_name,
                      "title": (title or link["title"] or spot_name)[:200],
                      "ch_name": ch_name, "ch_url": ch_url, "ch_img": img, "ch_desc": desc})
        print(f"{rank}위 {p['author']} 유튜브 {len(p['yt'])}개 → {spot_name}({link['spot_id']}) {vid} 채널 {ch_name or '-'} 사진 {'있음' if img else '없음'}")

    pick_vids = {x["vid"] for x in picks}
    # 1) 지난 크리에이터 영상은 뒤로 밀고 12개 넘으면 숨긴다. 운영팀 영상은 늘 그 뒤.
    old_creator = [r for r in rows if r["creator"] and r["is_active"] and r["video_id"] not in pick_vids]
    for i, r in enumerate(old_creator):
        keep = TOP_N + i < MAX_CREATOR_ROWS
        write("PATCH", "featured_videos?id=eq." + str(r["id"]), {"sort_order": TOP_N + 1 + i, "is_active": keep})
    for r in rows:
        if not r["creator"] and r["sort_order"] < 1000:
            write("PATCH", "featured_videos?id=eq." + str(r["id"]), {"sort_order": 1000 + r["id"]})

    # 2) 이번 주 4개를 맨 앞에 (이미 있던 영상이면 앞으로 당기고 정보만 새로)
    existing = {r["video_id"]: r for r in rows}
    for x in picks:
        body = {"title": x["title"], "spot_name": x["spot_name"], "spot_id": x["spot_id"], "creator": x["author"],
                "view_desc": "", "video_url": "https://youtu.be/" + x["vid"], "video_id": x["vid"],
                "thumb_url": "https://img.youtube.com/vi/" + x["vid"] + "/hqdefault.jpg",
                "is_active": True, "sort_order": x["rank"]}
        # 채널 정보를 못 가져왔으면 예전에 저장된 값을 지우지 않는다
        for k, v in (("channel_name", x["ch_name"]), ("channel_url", x["ch_url"]), ("channel_img", x["ch_img"]), ("channel_desc", x["ch_desc"])):
            if v:
                body[k] = v
        if x["vid"] in existing:
            write("PATCH", "featured_videos?id=eq." + str(existing[x["vid"]]["id"]), body)
        else:
            write("POST", "featured_videos", body)

    # 3) 감사 알림 (대표님이 고른 문구). 이미 줄에 있던 영상이 다시 뽑히면 같은 감사 알림을 또 보내지 않는다.
    for x in picks:
        if x["vid"] in existing:
            print(f"  {x['author']}: 이미 소개된 영상이라 알림은 건너뜀")
            continue
        ch = x["ch_name"] or x["author"]
        body = (f"[{x['spot_name']}] 영상을 낭만루트에 등록해 주셔서 진심으로 감사드립니다.\n"
                "공유해 주신 영상은 다른 낭만루터분들이 박지를 고르는 데 큰 도움이 되고 있습니다.\n"
                f"감사한 마음을 담아 [{ch}] 채널을 홈 '낭만! 크리에이터의 그 장소'에 소개해 드렸습니다.\n"
                "앞으로의 여정도 낭만루트가 함께 응원하겠습니다.")
        notify({
            "id": "adm_creator_featured_" + week + "_" + x["uid"][:60], "user_id": x["uid"], "kind": "admin_creator_featured",
            "title": "낭만! 크리에이터의 그 장소에 소개되었습니다", "body": body,
            "related_id": "", "related_spot_id": x["spot_id"], "related_spot_name": x["spot_name"], "is_read": False})

    # 4) 관리자 요약
    summary = "\n".join(f"{x['rank']}위 {x['author']}({x['ch_name'] or '채널 이름 못 가져옴'}) 유튜브 {x['count']}개 · {x['spot_name']}" for x in picks)
    for a in admins:
        notify({
            "id": "adm_creator_weekly_" + week + "_" + a[:60], "user_id": a, "kind": "admin_creator_weekly",
            "title": "이번 주 크리에이터의 그 장소를 바꿨어요",
            "body": "지난 7일 유튜브 등록 순으로 홈 줄 앞에 올리고 감사 알림을 보냈어요.\n" + summary,
            "related_id": "", "related_spot_id": "", "related_spot_name": "", "is_read": False})
    print("끝" + (" (미리보기, 바꾼 것 없음)" if DRY else ""))


if __name__ == "__main__":
    main()
