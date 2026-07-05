# PeerPush activity agent

Checks PatternProof's PeerPush listing daily for new upvotes and comments,
and hands the results to a Claude Code session, which drafts reply/social
copy for human approval — it never posts or replies automatically.

## How it works

1. A daily scheduled trigger fires into the Claude Code session that set
   this up.
2. Claude runs `npm run check` in this directory, which:
   - looks up the "PatternProof" product via `GET {baseUrl}/products`
     (paginating until it finds a name match),
   - fetches its comments,
   - diffs both against `state.json` from the previous run,
   - prints a JSON report of what's new, and updates `state.json`.
3. Claude reads the report and, if there's new activity (or it's been a
   while since the last promotional push), drafts:
   - thank-you replies to new commenters,
   - a short social post asking people to check out / upvote / share
     PatternProof,
   and sends them to you via push notification + chat message for review.
   You copy/edit/post them yourself — nothing is auto-published.
4. `state.json` is committed back to the repo so the next run doesn't
   re-surface the same comments.

## Setup required before this works

- **Network access**: this repo's dev environment currently blocks
  outbound requests to `peerpush.com` at the network-policy level. Add
  `peerpush.com` to the environment's allowed domains (environment
  settings in Claude Code on the web) before the trigger can fetch real
  data.
- **Auth (if needed)**: if `/api/v1/products` requires authentication for
  anything beyond public listings (e.g. to see your own comments), set
  `PEERPUSH_API_KEY` as an environment variable. `check.ts` sends it as
  both `Authorization: Bearer <key>` and `X-API-Key: <key>` since the
  actual scheme hasn't been confirmed yet.

## Known unverified assumptions

This was built without a working connection to `peerpush.com`, so the
following are best-effort guesses marked `FIXME` in `check.ts` — verify
and adjust them against real responses:

- Envelope/field names for the products list (tries `products`, `data`,
  `items`, `results`) and for a single product's upvote count (tries
  `upvotes`, `upvote_count`, `votes_count`).
- Pagination convention (tries `?page=N` with a `next_page`/`next_cursor`
  field in the response).
- The comments endpoint (`GET /products/:id/comments`, falling back to an
  embedded `comments` field on the product resource).

Run `npm install && PEERPUSH_API_KEY=... npm run check` from this
directory once network access is granted, compare the JSON report against
what you see on your PeerPush dashboard, and fix any mismatched field
names in `check.ts`.
