# lumen-reddit

Reddit client for [Rokid Lumen](https://github.com/beyondlevi/rokid-lumen) glasses, built as a Meta Ray-Ban Display (MRBD) web app with the
official [UI Toolkit for Meta Ray-Ban Display](https://github.com/facebook/meta-ray-ban-display-ui-toolkit-web).
It browses Reddit with the wearer's own Reddit session.

> **Unofficial.** lumen-reddit is an independent project. It is not affiliated with, endorsed or
> sponsored by Reddit, Inc., Meta Platforms, Inc., or Rokid. Reddit is a trademark of Reddit, Inc.,
> used here only to say what the app works with.
>
> **Use at your own risk.** The app uses your own Reddit session cookies, not a registered OAuth app,
> and the optional renewal Worker signs in to www.reddit.com for you. This may not comply with
> Reddit's User Agreement or Data API Terms; Reddit may block it or act on the account. Use it only
> with your own account, for yourself. The software is provided "as is", without warranty (see
> [LICENSE](LICENSE)).

- **Home, Popular, Communities, Inbox**: four peer tabs (`SubNavigationPager`). Each tab loads the first
  time it is shown, so opening the app costs two requests (the account and Home).
- **Feeds**: posts with a picture are Cards (title and community over the bottom scrim); every other post
  is a list row with the community's icon, the title on two lines and the time. NSFW and spoiler posts
  never show their picture and carry an eye-slash mark. The next page loads when focus nears the end.
- **Post**: the picture (Enter opens it full screen) or the text on a Panel, author and tags (flair,
  Pinned, NSFW, Spoiler, Video, Gallery), then a dock with **Upvote** (with the score), **Downvote**,
  **Comments** and **Save**. Votes and saves show at once and are rolled back, with a toast, if Reddit
  refuses them. Pressing an active vote takes it back.
- **Comments**: the top-level comments; Enter opens a comment in full, with Upvote, Downvote and its
  replies, which open the same way, level by level (four levels, 60 comments per post).
- **Communities**: the communities the account joined, A to Z; each opens its feed, with Hot, New, Top
  (today) and Rising in the dock's Sort menu.
- **Inbox**: replies, mentions and private messages; unread ones have the unread dot and an accent time.
  Opening one marks it read on Reddit; a comment reply has **View post**.
- **Text**: Reddit markdown becomes plain paragraphs. The app never renders HTML from Reddit.
- **Language**: English by default; Portuguese (pt-BR wording) for any `pt-*` `navigator.language`,
  including the glasses' `pt-PT`. All UI strings are in `src/i18n/strings.ts`.

## The Reddit session

The app runs on two cookies of a signed-in reddit.com browser session, set in the companion's Apps tab
(secrets stay on the glasses; each field takes the bare value, `name=<value>`, or a whole pasted Cookie
header):

| Field | What | Lasts |
| --- | --- | --- |
| `reddit.session` | the `reddit_session` cookie | about 180 days |
| `reddit.renewUrl` | the session Worker's address, `https://lumen-reddit-session.<subdomain>.workers.dev/token` | |
| `reddit.renewKey` | the Worker's `RENEW_KEY` | |
| `reddit.token` | the `token_v2` cookie (optional with the three above) | about 24 hours |

Every Reddit request goes as `Authorization: Bearer <token_v2>` straight to `https://oauth.reddit.com`, which
allows cross-origin requests with that header, so feeds, votes and saves need no proxy. When there is no
token_v2, or it ends within ten minutes, or Reddit rejects it, the app asks the **session Worker** for a
new one (one renewal at a time, shared by every waiting request) and repeats the rejected request once.
Opening the app with only `reddit.session` costs three requests: the renewal, the account and Home.

### Why a Worker

A browser cannot send a Cookie header, and the only way to get a token_v2 from reddit_session is the way
reddit.com's own pages get it: loading `https://www.reddit.com/` with the `reddit_session` cookie makes
Reddit answer with a fresh `token_v2` cookie. `worker/index.mjs` does exactly that, from Cloudflare, and
returns `{token, expiresAt}`; it reads only the response headers, keeps nothing and logs nothing.
(reddit-feed-even, the Even Realities client this app started from, doesn't renew anything: it sends both
cookies through its own Worker to www.reddit.com's JSON endpoints. From Cloudflare those endpoints answer
a cookie-authenticated request with a 403 "Blocked" page, while the HTML page above is served.) Official
OAuth apps would avoid all this, but since November 2025 Reddit only issues them after a manual review.

Measured on 2026-10-03 from Cloudflare: www.reddit.com with reddit_session → 200 and a new token_v2
valid 24 hours; that token on oauth.reddit.com → 200.

Deploy (the token needs the "Edit Cloudflare Workers" template; the account needs a workers.dev subdomain):

```sh
CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… RENEW_KEY=$(openssl rand -base64 32) node scripts/deploy-worker.mjs
```

The key keeps the Worker from being anyone's reddit_session-to-token service; put the same value in
`reddit.renewKey`. Without `RENEW_KEY` the script redeploys the code and keeps the key.

To copy the cookies: on a computer, sign in to reddit.com, open the developer tools, Application (Chrome) or
Storage (Firefox), Cookies, `https://www.reddit.com`, and copy `reddit_session` (and `token_v2` if wanted).

Limits to know:

- **reddit_session ends after about 180 days** (its `exp` claim), or when you sign out on reddit.com. The app
  then shows **Signed out of Reddit**: copy reddit_session again. With only `reddit.token`, the token ends
  after a day; the app warns when less than two hours are left and shows **Session expired** after.
- **Rate limit**: about 100 requests per 10 minutes for the session. Reddit answers an exhausted window with a
  429 that has no CORS headers, which a browser sees as a network failure, so the client stops with a
  reserve of three requests (votes and saves may still use it) and shows **Too many requests** with the
  wait. Nothing polls, and failed loads never retry by themselves.
- **Blocked user agents**: Reddit answers `HeadlessChrome` with a 403 "Blocked" page (no CORS headers). This
  only matters for automated runs against the real API: use Firefox or a regular Chrome user agent there.
  GeckoView on the glasses is not affected.
- If Reddit starts blocking Cloudflare's network for the HTML page too, the Worker answers 502 `blocked` and
  the app shows **Can't renew the session**; a pasted `reddit.token` still works for its day.
- Videos do not play on the glasses (the post says so); galleries show their first picture.
- Writing comments, voting on polls and the "load more comments" stubs are not in this version.


> **Your cookies are your account.** `reddit_session` gives full access to your Reddit account for
> about six months, and `token_v2` for a day. Never share them, never put them in a Worker you didn't
> deploy yourself (the Worker receives `reddit_session`), and sign out on reddit.com to revoke them.

## Manifest

`public/manifest.webmanifest` declares `lumen_internet`, `lumen_notifications` (below) and the
`lumen_config` fields above (all optional; the app tells what is missing) and `demo`. With `demo` set to exactly `demo-captures`, the app answers from
fictional content (`src/demo/fixtures.json`, illustrated pictures in `src/demo/assets/`), in English,
for screenshots and videos. Votes, saves and read marks then change only that in-memory copy.

## Opening from notifications

The manifest's `lumen_notifications` entry lets an open Reddit notification (`com.reddit.frontpage`) on the
glasses offer this app, which Lumen opens at `/notification/{tag}` with the notification's tag on the phone
(Lumen 0.2.0-beta.9 or later). `src/notification.ts` reads the tag: activity on a post
(`agg:t2_<user>:t3_<post>:<n>`) opens that post, or its comment when the tag also names a `t1_` comment that
the thread shows; a message (`t4_`), a UUID, a group summary or anything else opens the Inbox tab. The
notification route replaces itself, so Back goes to Home. With no tag, Lumen opens the start page.

## Develop

```sh
npm install
npm run dev                         # http://localhost:5173
npm test                            # unit tests (vitest)
npm run package                     # typecheck, build, dist/lumen-reddit.mrbd.zip
npm run test:e2e                    # keyboard e2e, Chromium and Firefox, against mock/server.mjs
node mock/server.mjs                # the mock API alone, on 127.0.0.1:8090
```

In a regular browser there is no `window.lumen`, so the settings come from the address once and are kept
in localStorage (the parameters are removed from the address bar):

```text
http://localhost:5173/?demo=demo-captures
http://localhost:5173/?reddit.token=<token_v2>
http://localhost:5173/?reddit.session=<reddit_session>&reddit.renewUrl=<worker>/token&reddit.renewKey=<key>
http://localhost:5173/?reddit.token=mock-session-token-for-e2e-tests-only&reddit.api=http://127.0.0.1:8090
```

`reddit.api` (development and tests only, not in the manifest) points the client at another origin.

The UI Toolkit's checks pass on this source: `validate-app-structure.mjs src` (screen architecture) and
`audit-runtime.mjs` on every route, from the toolkit's `llm-skills/uit-screen-architecture-web/scripts`.

## Layout

```text
src/config/lumenConfig.ts   the lumen_config contract: token parsing, expiry, dev fallback, demo switch
src/reddit/                 client (Bearer, errors, rate limit), session renewal, parsers, markdown, models
src/state/                  session (client, account, request runner), posts/feeds/threads, inbox/communities
src/RedditProvider.tsx      one store around the page transitions
src/notification.ts         where a phone notification's tag opens the app (post, comment or Inbox)
src/pages/                  HomePage (tabs), FeedPosts, CommunitiesTab, InboxTab, SubredditPage,
                            PostPage, CommentsPage, CommentPage, MessagePage, PhotoPage, SessionPage,
                            NotificationPage
src/components/             state content (empty, error, loading), vote buttons, avatar fallback
src/demo/                   demo client, fixtures and pictures (also served by the mock)
worker/index.mjs            the session Worker (Cloudflare); scripts/deploy-worker.mjs deploys it
mock/server.mjs             oauth.reddit.com and Worker stand-in for the e2e tests
tests/unit, tests/e2e       vitest and Playwright
```

## Install on the glasses

```sh
npm run package
scripts/push-webapp.sh dist/lumen-reddit.mrbd.zip     # from the rokid-lumen repository
```

or, on the phone, the companion's Apps tab, **Add > Offline package from a file**. Then set the Reddit
session in the app's settings there.

## License

MIT, see [LICENSE](LICENSE). Copyright (c) 2026 Levi Nóbrega.

Credits and third-party:

- Inspired by [reddit-feed-even](https://github.com/plungarini/reddit-feed-even) by Pietro Lungarini (MIT).
- Built on the [UI Toolkit for Meta Ray-Ban Display](https://github.com/facebook/meta-ray-ban-display-ui-toolkit-web)
  (`@wearables-ui-toolkit/mrbd`, `foundation`: Apache-2.0, Copyright Meta Platforms, Inc.);
  `@wearables-ui-toolkit/icons`, bundled into the built `.mrbd.zip`, is under the Meta Wearables
  Developer Terms.
- Runtime dependencies are MIT or Apache-2.0. Build tools keep their own licenses.
