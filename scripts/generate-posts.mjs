#!/usr/bin/env node
// Generates platform-tuned PatternProof post drafts from content/brief.md.
// Usage: ANTHROPIC_API_KEY=sk-... node scripts/generate-posts.mjs [platform ...]

import Anthropic from "@anthropic-ai/sdk";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BRIEF_PATH = path.join(ROOT, "content", "brief.md");
const OUTPUT_DIR = path.join(ROOT, "content", "output");
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5";

const IMAGE_INSTRUCTIONS = `
- Also produce a line starting exactly with "ON-IMAGE TEXT:" — a short (4-12
  word) line to be overlaid on a graphic. It must work standalone, without the
  caption.
- The accompanying image is an abstract typographic/pattern graphic (scattered
  marks resolving into an ordered grid — the brand's visual identity), NOT a
  photo. Given PatternProof serves abuse survivors, never suggest, describe,
  or imply photographic depictions of people, distress, injury, or literal
  "before/after" abuse imagery anywhere in the post or the on-image text —
  that would be exploitative. Keep the on-image text dignified and calm, not
  dramatic.`;

const PLATFORMS = {
  reddit: {
    label: "Reddit",
    guidelines: `
Write as a real person posting to a relevant subreddit, not as a company.
This must NOT be able to double as a LinkedIn or Facebook post with the serial
numbers filed off — if a sentence sounds like it belongs in a company update,
cut it.
Hard rules:
- First person, casual, imperfect phrasing is fine and expected.
- Center the post on the specific personal situation described in the brief's
  "personal story" section. Lead with the situation, not the product.
- Do NOT open with a hook that sounds like ad copy ("Ever wonder...",
  "Tired of..."). Open the way someone would actually start telling a story.
- Never use marketing words: revolutionary, game-changer, unlock, seamless,
  empower, elevate, cutting-edge, unleash.
- No "proof point" stats recited like a pitch (e.g. "saves attorneys 20-120
  hours") — that phrasing belongs on LinkedIn, not in a personal story. If a
  number like that comes up at all here, it's mentioned offhand in the
  survivor's/founder's own words, not as a headline stat.
- Mention the product naturally, once, roughly where a real person would
  organically bring it up in the story — not as a pitch, not with a link
  dropped at the end like an ad.
- No emoji. No hashtags. No exclamation-point enthusiasm.
- It's fine — often better — for the post to be a question or an ambivalent
  reflection rather than an endorsement.
- Do not invent details (numbers, quotes, features) not present in the brief.
- Acknowledge self-promotion plainly if the post is clearly about something
  you built or use often (e.g. a short parenthetical), since Reddit punishes
  undisclosed astroturfing far harder than it punishes disclosed involvement.
- Given the subject matter (abuse documentation), never name or identify a
  real abuser or a real survivor other than the consenting person telling
  their own story from the brief.
- Length: whatever the story actually needs. Don't pad it.`,
  },
  x: {
    label: "X (Twitter)",
    guidelines: `
Write for X/Twitter.
- Strong, concrete first line — the hook, not a preamble.
- Plain, direct language. No corporate voice, no "excited to announce."
- Under ~280 characters for the core post; if it needs more room, format as a
  short thread (numbered tweets separated by "---").
- At most one hashtag, only if it's genuinely how people search this topic.
- One link/CTA max, only if the brief provides one.
- Do not invent stats or quotes not present in the brief.`,
  },
  linkedin: {
    label: "LinkedIn",
    guidelines: `
Write for LinkedIn — a professional, industry-facing audience (lawyers,
advocates, legal-tech people), not a peer-support audience. This is the
opposite register from Reddit: here it's fine, even expected, to state the
problem this solves for the profession plainly and to cite the brief's proof
point (e.g. hours saved) directly — that reads as credible on LinkedIn and
would read as tone-deaf on Reddit.
- First person, professional but not stiff — an actual insight, not a press
  release. Written like a founder or practitioner sharing something learned.
- Lead with the problem/insight, not the product name.
- One clear takeaway. Short paragraphs, no wall of text.
- Soft, single CTA at the end (at most), only if the brief supplies one.
- No hashtag spam (0-3 relevant ones max, if any).
- Do not invent stats, customer counts, or quotes not present in the brief.
- Frame around the professional's problem (attorney/advocate time,
  case-prep burden) rather than the survivor's personal experience — leave
  the personal story register to Reddit.
- 100-200 words.`,
  },
  instagram: {
    label: "Instagram",
    needsImage: true,
    guidelines: `
Write for Instagram.
- Caption should work with the accompanying graphic — write it to stand alone
  even though the image itself carries almost no text.
- Conversational, can use emoji sparingly IF the brief's brand voice allows it
  (skip emoji entirely if the brand voice is described as understated/dry).
- End with a short block of 3-8 relevant hashtags (not generic spam tags).
- Do not invent stats or quotes not present in the brief.
${IMAGE_INSTRUCTIONS}`,
  },
  facebook: {
    label: "Facebook",
    needsImage: true,
    guidelines: `
Write for Facebook.
- Conversational and community-oriented, slightly warmer/longer than X, less
  formal than LinkedIn. Storytelling is fine.
- Written for a broad, non-technical audience — explain any jargon in plain
  terms.
- Single clear CTA at the end, only if the brief supplies one.
- Do not invent stats or quotes not present in the brief.
- 60-150 words.
${IMAGE_INSTRUCTIONS}`,
  },
};

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      "Missing ANTHROPIC_API_KEY. Set it as an environment variable before running " +
        "(never commit it, never paste it into a chat). Example:\n" +
        "  ANTHROPIC_API_KEY=sk-ant-... npm run generate"
    );
    process.exit(1);
  }

  const brief = await readFile(BRIEF_PATH, "utf8");
  if (brief.includes("[One or two concrete paragraphs")) {
    console.error(
      `content/brief.md still has placeholder text. Fill it in with real PatternProof ` +
        `details before generating — otherwise the output will be generic and will read as AI-written.`
    );
    process.exit(1);
  }

  const requested = process.argv.slice(2);
  const targets = requested.length ? requested : Object.keys(PLATFORMS);

  if (targets.includes("reddit") && brief.includes("[STILL NEEDED")) {
    console.error(
      `content/brief.md's "personal story" (or another section marked [STILL NEEDED) hasn't ` +
        `been filled in. The Reddit post specifically depends on a real story — fill it in, or ` +
        `run other platforms only, e.g.: node scripts/generate-posts.mjs linkedin x`
    );
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const key of targets) {
    const platform = PLATFORMS[key];
    if (!platform) {
      console.error(`Unknown platform "${key}". Valid: ${Object.keys(PLATFORMS).join(", ")}`);
      continue;
    }
    console.log(`Generating ${platform.label}...`);

    const draft = await draftPost(client, platform, brief);
    const { final, notes } = await critiqueAndRefine(client, platform, brief, draft);

    const out = [
      `# ${platform.label} — PatternProof`,
      ``,
      `## Final (review before posting)`,
      ``,
      final.trim(),
      ``,
      `---`,
      ``,
      `## Editor notes (what was changed and why)`,
      ``,
      notes.trim(),
      ``,
      `<details><summary>First draft (for reference)</summary>`,
      ``,
      draft.trim(),
      ``,
      `</details>`,
      ``,
    ].join("\n");

    const outPath = path.join(OUTPUT_DIR, `${key}.md`);
    await writeFile(outPath, out, "utf8");
    console.log(`  -> ${path.relative(ROOT, outPath)}`);
  }

  const imageTargets = targets.filter((k) => PLATFORMS[k]?.needsImage);
  if (imageTargets.length) {
    console.log(
      `\nTo render graphics for ${imageTargets.join(", ")}, run:\n` +
        `  node scripts/render-images.mjs ${imageTargets.join(" ")}`
    );
  }
  console.log(
    "\nDone. Read every file in content/output before posting anything — " +
      "these are drafts, not approved copy."
  );
}

async function draftPost(client, platform, brief) {
  const system = `You write social media posts for a real product called PatternProof, using only the
facts given in the brief below. Never invent features, numbers, quotes, or claims that aren't
in the brief. If the brief lacks detail needed for a good post, write a shorter, honest post
rather than padding with invented specifics.

${platform.guidelines}`;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: [
      {
        role: "user",
        content: `Brief:\n\n${brief}\n\nWrite the ${platform.label} post now. Output only the post text (plus the "ON-IMAGE TEXT:" line if instructed) — no preamble, no explanation.`,
      },
    ],
  });
  return textFrom(res);
}

async function critiqueAndRefine(client, platform, brief, draft) {
  const system = `You are a ruthless, platform-native editor for ${platform.label}. You are reviewing a
draft post for PatternProof before it goes out. Check specifically for:
1. Anything that reads as AI-generated: cliché openers, uniform sentence rhythm, overused
   words (revolutionary, seamless, unlock, elevate, empower, game-changer, dive in, in today's
   world), excessive triads ("X, Y, and Z"), or hollow enthusiasm.
2. Whether it actually matches ${platform.label} norms and is the kind of thing that performs
   well there, not just "content."
3. Any claim, number, or quote that isn't directly supported by the brief — flag and remove it.
4. For Reddit specifically: would an experienced Redditor immediately clock this as an ad and
   downvote/report it? If so, it needs to change.
5. Whether this could be mistaken for a post written for a different platform with minimal
   edits — if so, rewrite it to actually fit ${platform.label}'s norms and audience.

${platform.guidelines}

Respond in exactly this format:
NOTES:
<bulleted list of what was wrong and what you changed, 2-6 bullets>

FINAL:
<the fully rewritten post, ready to publish as-is${
    platform.needsImage ? ', ending with a line starting "ON-IMAGE TEXT:"' : ""
  }>`;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system,
    messages: [
      {
        role: "user",
        content: `Brief:\n\n${brief}\n\nDraft post to review:\n\n${draft}`,
      },
    ],
  });
  const text = textFrom(res);
  const finalMatch = text.match(/FINAL:\s*([\s\S]*)/i);
  const notesMatch = text.match(/NOTES:\s*([\s\S]*?)(?:\n\s*FINAL:|$)/i);
  return {
    final: finalMatch ? finalMatch[1].trim() : text.trim(),
    notes: notesMatch ? notesMatch[1].trim() : "(no notes returned)",
  };
}

function textFrom(res) {
  return res.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
