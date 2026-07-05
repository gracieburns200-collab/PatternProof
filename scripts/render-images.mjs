#!/usr/bin/env node
// Renders on-brand graphics for image-bearing posts (Instagram, Facebook) by
// reading the "ON-IMAGE TEXT:" line out of content/output/<platform>.md and
// screenshotting an HTML/CSS design at the right social dimensions.
//
// Deliberately abstract/typographic, not photographic: PatternProof serves
// abuse survivors, so stock "sad person" photos or AI-generated depictions of
// people in distress are inappropriate here. The pattern motif (scattered
// marks resolving into an ordered grid) is the visual metaphor instead.
//
// Usage: node scripts/render-images.mjs [platform ...]   (default: instagram facebook)

import { chromium } from "playwright-core";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "content", "output");
const IMAGES_DIR = path.join(OUTPUT_DIR, "images");
const CHROMIUM_PATH = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const SPECS = {
  instagram: { width: 1080, height: 1350 }, // 4:5 portrait
  facebook: { width: 1200, height: 630 }, // 1.91:1 link/feed image
};

async function main() {
  const requested = process.argv.slice(2);
  const targets = requested.length ? requested : Object.keys(SPECS);

  await mkdir(IMAGES_DIR, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });

  try {
    for (const platform of targets) {
      const spec = SPECS[platform];
      if (!spec) {
        console.error(`No image spec for "${platform}". Valid: ${Object.keys(SPECS).join(", ")}`);
        continue;
      }

      const mdPath = path.join(OUTPUT_DIR, `${platform}.md`);
      let md;
      try {
        md = await readFile(mdPath, "utf8");
      } catch {
        console.error(`Missing ${path.relative(ROOT, mdPath)} — run "npm run generate" first.`);
        continue;
      }

      const match = md.match(/ON-IMAGE TEXT:\s*(.+)/i);
      if (!match) {
        console.error(
          `No "ON-IMAGE TEXT:" line found in ${path.relative(ROOT, mdPath)} — skipping image.`
        );
        continue;
      }
      const text = match[1].trim();

      const page = await browser.newPage({ viewport: { width: spec.width, height: spec.height } });
      await page.setContent(renderHtml(text, spec), { waitUntil: "networkidle" });
      const outPath = path.join(IMAGES_DIR, `${platform}.png`);
      await page.screenshot({ path: outPath });
      await page.close();
      console.log(`  -> ${path.relative(ROOT, outPath)}`);
    }
  } finally {
    await browser.close();
  }
}

function renderHtml(text, { width, height }) {
  // Scattered dots on the left resolving into an ordered grid on the right —
  // the "pattern" becoming "proof." No people, no photography.
  const dots = [];
  const rows = 10;
  const cols = 14;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = c / (cols - 1); // 0 = chaotic, 1 = ordered
      const gridX = (c + 0.5) * (width / cols);
      const gridY = (r + 0.5) * (height / rows);
      const jitter = (1 - t) * 34;
      const x = gridX + (Math.sin(r * 12.9898 + c * 78.233) * 43758.5453 % 1) * jitter;
      const y = gridY + (Math.cos(r * 45.164 + c * 12.343) * 12543.234 % 1) * jitter;
      const size = 3 + t * 2.5;
      const opacity = 0.15 + t * 0.35;
      dots.push(
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size.toFixed(
          1
        )}" fill="#8fb3c9" opacity="${opacity.toFixed(2)}" />`
      );
    }
  }

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  html, body {
    margin: 0; padding: 0;
    width: ${width}px; height: ${height}px;
    background: linear-gradient(135deg, #101826 0%, #16233a 55%, #1c2f47 100%);
    font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
    overflow: hidden;
  }
  .wrap {
    position: relative;
    width: 100%; height: 100%;
    display: flex; flex-direction: column;
    justify-content: center;
    box-sizing: border-box;
    padding: ${Math.round(width * 0.09)}px;
  }
  svg.pattern { position: absolute; inset: 0; width: 100%; height: 100%; }
  .text {
    position: relative;
    color: #f4f7f9;
    font-size: ${Math.round(width * 0.062)}px;
    line-height: 1.28;
    font-weight: 600;
    letter-spacing: -0.01em;
    max-width: 86%;
  }
  .mark {
    position: absolute;
    left: ${Math.round(width * 0.09)}px;
    bottom: ${Math.round(width * 0.06)}px;
    color: #8fb3c9;
    font-size: ${Math.round(width * 0.032)}px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
</style>
</head>
<body>
  <div class="wrap">
    <svg class="pattern" viewBox="0 0 ${width} ${height}">${dots.join("")}</svg>
    <div class="text">${escapeHtml(text)}</div>
  </div>
  <div class="mark">PatternProof</div>
</body>
</html>`;
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
