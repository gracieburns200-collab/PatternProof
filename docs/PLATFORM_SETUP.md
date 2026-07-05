# What real auto-publishing would require

This repo generates content but does not publish it. Turning it into an
actual "full scheduler + auto-publish" system means building against each
platform's API, and every one of them needs you (a human, on that platform)
to register a developer app first — that step can't be done from here.

Realistic effort/timeline per platform:

| Platform | What's needed | Rough lead time |
|---|---|---|
| **Reddit** | Register a "script" app at reddit.com/prefs/apps, get client id/secret. API access itself is same-day. **But**: Reddit's rules treat automated/scheduled posting from a company account as spam-adjacent, especially in support/advice subreddits — this is the platform where a human posting manually is genuinely the safer choice, not just the easier one. | Same day (but reconsider automating this one at all) |
| **X (Twitter)** | Developer account + app in the X Developer Portal. Posting (write access) requires a **paid** API tier (Basic tier is $100+/month as of last pricing). | Same day, but has an ongoing cost |
| **LinkedIn** | LinkedIn's posting APIs (Share/Posts API) require applying to the **LinkedIn Marketing Developer Platform** and getting approved for the right product — this is a manual review process, not instant self-serve. | Days to weeks, approval not guaranteed |
| **Facebook / Instagram** | Meta Graph API via a Meta for Developers app, using a Facebook Page (and an Instagram Business/Creator account linked to it). Publishing permissions (`pages_manage_posts`, `instagram_content_publish`) require **App Review** by Meta. | 1-2+ weeks, approval not guaranteed |

### If you want to move forward on this

The fastest, lowest-risk path is usually:
1. Pick **one** platform to start with (X or Reddit are the quickest to get API access for; Reddit is still worth doing manually given the spam-policy risk above).
2. Register the developer app yourself on that platform's site.
3. Give me the resulting API credentials as environment variables (never pasted permanently into a file that gets committed) and I'll build the actual publish integration for that one platform, so it can be tested end-to-end before expanding to others.

Building speculative "integration" code for all five now, before any credentials exist to test it against, would just be unverified code nobody can confirm works — better to do it one platform at a time, for real.
