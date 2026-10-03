"""Writes src/demo/fixtures.json: fictional Reddit API answers (raw_json shapes)
for demo mode and the e2e mock server. Image URLs use the `demo:<name>`
placeholder; the demo client and the mock server each replace it.
Usage: python3 scripts/generate-demo-fixtures.py"""
import json
from pathlib import Path

NOW = 1790000000  # fixed; ages are computed against the real clock at runtime
H = 3600


def sr(name, icon=None):
    return {"display_name": name, "display_name_prefixed": f"r/{name}", "community_icon": icon or "", "icon_img": ""}


def post(pid, sub, title, author, age, score, comments, *, self_text="", hint=None, domain=None,
         image=None, flair=None, likes=None, saved=False, gallery=False, video=False, nsfw=False, pinned=False):
    data = {
        "id": pid, "name": f"t3_{pid}", "title": title, "subreddit": sub,
        "subreddit_name_prefixed": f"r/{sub}", "author": author, "created_utc": NOW - age,
        "score": score, "hide_score": False, "num_comments": comments, "likes": likes, "saved": saved,
        "is_self": hint is None and domain is None and not gallery, "selftext": self_text,
        "domain": domain or f"self.{sub}", "link_flair_text": flair, "over_18": nsfw, "spoiler": False,
        "stickied": pinned, "is_video": video, "sr_detail": sr(sub),
        "permalink": f"/r/{sub}/comments/{pid}/x/",
    }
    if hint:
        data["post_hint"] = hint
    if image:
        w, h = image[1]
        data["preview"] = {"images": [{
            "source": {"url": f"demo:{image[0]}", "width": w, "height": h},
            "resolutions": [{"url": f"demo:{image[0]}", "width": 640, "height": round(640 * h / w)}],
        }]}
    if gallery:
        data["is_gallery"] = True
        data["is_self"] = False
        data["domain"] = "reddit.com"
        data["gallery_data"] = {"items": [{"media_id": "m1", "id": 1}, {"media_id": "m2", "id": 2}]}
        data["media_metadata"] = {"m1": {"status": "valid", "e": "Image", "m": "image/webp",
                                         "s": {"u": f"demo:{image[0]}", "x": image[1][0], "y": image[1][1]},
                                         "p": [{"u": f"demo:{image[0]}", "x": 640, "y": round(640 * image[1][1] / image[1][0])}]},
                                  "m2": {"status": "valid", "e": "Image", "m": "image/webp",
                                         "s": {"u": f"demo:{image[0]}", "x": image[1][0], "y": image[1][1]}}}
    return {"kind": "t3", "data": data}


def listing(children, after=None):
    return {"kind": "Listing", "data": {"after": after, "children": children}}


def comment(cid, author, body, age, score, replies=(), more=0, likes=None):
    kids = [*replies]
    if more:
        kids.append({"kind": "more", "data": {"count": more, "children": ["zz1"]}})
    return {"kind": "t1", "data": {
        "id": cid, "name": f"t1_{cid}", "author": author, "body": body, "created_utc": NOW - age,
        "score": score, "score_hidden": False, "likes": likes, "stickied": False,
        "replies": listing(kids) if kids else ""}}


P1 = post("dm1", "smartglasses", "Which glasses are you actually wearing every day this year?", "maya_j", 2 * H, 1204, 86,
          self_text="I keep buying new pairs and going back to the same one.\n\nCurious what survives a whole week for you: **battery**, comfort, or the apps?\n\n- Battery\n- Comfort\n- Apps",
          flair="Discussion")
P2 = post("dm2", "AR_MR_XR", "Hands-on: reading long threads on a 600 px heads-up display", "alexlee", 5 * H, 342, 41,
          hint="link", domain="example.com")
P3 = post("dm3", "EarthPorn", "Fog rolling in over the coast at sunrise [OC] [4032x3024]", "sam.rivera", 3 * H, 24300, 214,
          hint="image", domain="i.redd.it", image=("coast", (4032, 3024)))
P4 = post("dm4", "brasil", "Qual app vocês mais usam no transporte público?", "carla_m", 6 * H, 88, 57,
          self_text="Estou montando uma lista de apps que funcionam bem com uma mão só.")
P5 = post("dm5", "programming", "What finally made keyboard-only navigation click for you?", "devon", 9 * H, 512, 133,
          self_text="Arrow keys, Enter and Escape. That is the whole interface on my glasses and it works better than I expected.")
P6 = post("dm6", "rokid_official", "My desk setup with the RG glasses", "rokid_fan", 26 * H, 77, 12,
          gallery=True, image=("desk", (3000, 2000)))
P7 = post("dm7", "pics", "A very quiet street after the rain", "noor", 4 * H, 15800, 320, hint="image",
          domain="i.redd.it", image=("street", (3000, 2000)))
P8 = post("dm8", "todayilearned", "TIL the first heads-up displays were built for fighter pilots in the 1950s", "histbuff", 7 * H, 40210, 1450,
          hint="link", domain="en.wikipedia.org")
P9 = post("dm9", "smartglasses", "Battery tips: what finally got me through a full workday", "sam.rivera", 4 * H, 230, 28,
          self_text="Screen off between glances, Wi-Fi off when the phone is near, and a short brightness ramp at night.")
P10 = post("dm10", "smartglasses", "Prescription inserts, a year later", "alexlee", 9 * H, 61, 19,
           self_text="Short version: worth it, but get the measurements done twice.")

fixtures = {
    "/api/v1/me": {"name": "lumen_demo", "inbox_count": 2},
    "/best": listing([P1, P2, P3, P4, P5], after="t3_dm5"),
    "/best?after=t3_dm5": listing([P6]),
    "/r/popular/hot": listing([P7, P8, P3]),
    "/r/smartglasses/hot": listing([P1, P9, P10]),
    "/r/smartglasses/new": listing([P9, P1, P10]),
    "/comments/dm1": [listing([P1]), listing([
        comment("c1", "alexlee", "Same pair for months. The apps matter less than being able to wear them all day without thinking about it.", 1 * H, 312,
                replies=[comment("c11", "maya_j", "Agreed. Comfort first, then battery, then everything else.", 45 * 60, 120,
                                 replies=[comment("c111", "alexlee", "Exactly my order too.", 30 * 60, 14)])], more=3),
        comment("c2", "sam.rivera", "Mine stay on because notifications finally work without pulling the phone out.", 30 * 60, 98),
        comment("c3", "devon", "Honestly the **band** is what keeps me wearing them. Swipes beat any touchpad.", 20 * 60, 44),
    ])],
    "/subreddits/mine/subscriber": listing([
        {"kind": "t5", "data": {"display_name": "smartglasses", "title": "Smart glasses", "public_description": "Daily wear, reviews and setups", "community_icon": "", "icon_img": "", "subscribers": 120400}},
        {"kind": "t5", "data": {"display_name": "AR_MR_XR", "title": "AR, MR and XR", "public_description": "Augmented and mixed reality news", "community_icon": "", "icon_img": "", "subscribers": 88000}},
        {"kind": "t5", "data": {"display_name": "brasil", "title": "Brasil", "public_description": "Brasil, brasileiros e o mundo", "community_icon": "", "icon_img": "", "subscribers": 1900000}},
        {"kind": "t5", "data": {"display_name": "EarthPorn", "title": "EarthPorn", "public_description": "Landscape photography", "community_icon": "", "icon_img": "", "subscribers": 24000000}},
        {"kind": "t5", "data": {"display_name": "programming", "title": "programming", "public_description": "Computer programming", "community_icon": "", "icon_img": "", "subscribers": 6000000}},
    ]),
    "/message/inbox": listing([
        {"kind": "t1", "data": {"name": "t1_r1", "author": "maya_j", "body": "Comfort first, then battery. Thanks for asking this!", "created_utc": NOW - 12 * 60, "new": True, "was_comment": True,
                                "subreddit": "smartglasses", "context": "/r/smartglasses/comments/dm1/which_glasses/r1/?context=3", "subject": "comment reply", "link_title": P1["data"]["title"]}},
        {"kind": "t1", "data": {"name": "t1_r2", "author": "alexlee", "body": "u/lumen_demo you were asking about this one.", "created_utc": NOW - 1 * H, "new": True, "was_comment": True,
                                "subreddit": "AR_MR_XR", "context": "/r/AR_MR_XR/comments/dm2/hands_on/r2/?context=3", "subject": "username mention", "link_title": P2["data"]["title"]}},
        {"kind": "t4", "data": {"name": "t4_m1", "author": "sam.rivera", "body": "Thanks for the battery tips, they helped a lot.", "created_utc": NOW - 30 * H, "new": False, "was_comment": False,
                                "subreddit": None, "context": "", "subject": "Battery tips"}},
    ]),
}
for p in (P1, P2, P3, P4, P5, P6, P7, P8, P9, P10):
    key = f"/comments/{p['data']['id']}"
    fixtures.setdefault(key, [listing([p]), listing([])])

out = Path(__file__).resolve().parent.parent / "src" / "demo" / "fixtures.json"
out.write_text(json.dumps({"now": NOW, "responses": fixtures}, ensure_ascii=False, indent=1) + "\n")
print(out, out.stat().st_size)
