# lumen-reddit

Reddit client for **Rokid Lumen** glasses, built as a Meta Ray-Ban Display (MRBD) web app with the
official [UI Toolkit for Meta Ray-Ban Display](https://github.com/facebook/meta-ray-ban-display-ui-toolkit-web).
It browses Reddit with the wearer's own Reddit session.

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

The app signs in with the `token_v2` cookie of a signed-in reddit.com browser session, set in the
companion's Apps tab as the `reddit.token` secret (it stays on the glasses). The field takes the bare
value, `token_v2=<value>`, or a whole pasted Cookie header; only `token_v2` is kept.

The token goes as `Authorization: Bearer <token_v2>` straight to `https://oauth.reddit.com`, which allows
cross-origin requests with that header (`Access-Control-Allow-Origin: *`), so no proxy is needed. The app
never puts it in a URL, a log line or an error.

To copy it: on a computer, sign in to reddit.com, open the developer tools, Application (Chrome) or Storage
(Firefox), Cookies, `https://www.reddit.com`, and copy the value of `token_v2`.

Limits to know:

- **A token_v2 lives about 24 hours** (its `exp` claim). Reddit's own site renews it in the browser, which an
  app on the glasses cannot do. The app warns (a toast at launch) when less than two hours are left, and
  shows **Session expired** once Reddit answers 401; paste a fresh value on the phone, then **Check again**.
- **Rate limit**: about 100 requests per 10 minutes for the session. Reddit answers an exhausted window with a
  429 that has no CORS headers, which a browser sees as a network failure, so the client stops with a
  reserve of three requests (votes and saves may still use it) and shows **Too many requests** with the
  wait. Nothing polls, and failed loads never retry by themselves.
- **Blocked user agents**: Reddit answers `HeadlessChrome` with a 403 "Blocked" page (no CORS headers). This
  only matters for automated runs against the real API: use Firefox or a regular Chrome user agent there.
  GeckoView on the glasses is not affected.
- Videos do not play on the glasses (the post says so); galleries show their first picture.
- Writing comments, voting on polls and the "load more comments" stubs are not in this version.

## Manifest

`public/manifest.webmanifest` declares `lumen_internet` and the `lumen_config` fields: `reddit.token`
(`secret`) and `demo` (optional). With `demo` set to exactly `demo-captures`, the app answers from
fictional content (`src/demo/fixtures.json`, illustrated pictures in `src/demo/assets/`), in English,
for screenshots and videos. Votes, saves and read marks then change only that in-memory copy.

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
http://localhost:5173/?reddit.token=mock-session-token-for-e2e-tests-only&reddit.api=http://127.0.0.1:8090
```

`reddit.api` (development and tests only, not in the manifest) points the client at another origin.

The UI Toolkit's checks pass on this source: `validate-app-structure.mjs src` (screen architecture) and
`audit-runtime.mjs` on every route, from the toolkit's `llm-skills/uit-screen-architecture-web/scripts`.

## Layout

```text
src/config/lumenConfig.ts   the lumen_config contract: token parsing, expiry, dev fallback, demo switch
src/reddit/                 client (Bearer, errors, rate limit), parsers, markdown to text, models
src/state/                  session (client, account, request runner), posts/feeds/threads, inbox/communities
src/RedditProvider.tsx      one store around the page transitions
src/pages/                  HomePage (tabs), FeedPosts, CommunitiesTab, InboxTab, SubredditPage,
                            PostPage, CommentsPage, CommentPage, MessagePage, PhotoPage, SessionPage
src/components/             state content (empty, error, loading), vote buttons, avatar fallback
src/demo/                   demo client, fixtures and pictures (also served by the mock)
mock/server.mjs             oauth.reddit.com stand-in for the e2e tests
tests/unit, tests/e2e       vitest and Playwright
```

## Install on the glasses

```sh
npm run package
scripts/push-webapp.sh dist/lumen-reddit.mrbd.zip     # from the rokid-lumen repository
```

or, on the phone, the companion's Apps tab, **Add > Offline package from a file**. Then set the Reddit
session in the app's settings there.
