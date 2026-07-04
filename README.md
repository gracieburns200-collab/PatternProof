# PatternProof

## Social content generator

`scripts/generate-posts.mjs` drafts platform-tuned posts (Reddit, X, LinkedIn,
Instagram, Facebook) for PatternProof using the Claude API, based on the facts
in `content/brief.md`.

This only generates drafts — it does not post anywhere. Read the output before
publishing anything.

### Setup

1. Fill in `content/brief.md` with real product details, target audience, and
   (for Reddit) an actual personal story/situation. Vague input produces
   vague, obviously-AI-sounding output.
2. Install dependencies: `npm install`
3. Set your API key as an environment variable — never commit it or paste it
   into chat:
   ```
   export ANTHROPIC_API_KEY=sk-ant-...
   ```

### Run

```
npm run generate                # all platforms
node scripts/generate-posts.mjs reddit x   # specific platforms only
```

Output lands in `content/output/<platform>.md` (gitignored), each with a
refined final draft, editor notes on what was changed and why, and the
original draft for reference.

### Posting

There's no automated posting to LinkedIn/Reddit/X/Instagram/Facebook here —
each platform's API requires its own app registration and credentials, and
Reddit in particular penalizes automated posting. Review each draft, then post
manually (or through a scheduler you already use).
