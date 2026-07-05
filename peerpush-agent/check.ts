// PeerPush activity checker.
//
// Finds this account's product on PeerPush, diffs its upvote count and
// comments against the last recorded state, and prints a JSON report to
// stdout describing what's new. It does not post anything itself — an
// operator (or the Claude session running this on a schedule) reads the
// report and drafts replies / social posts for human approval.
//
// The exact shape of PeerPush's /api/v1 responses hasn't been verified
// against a live connection (this environment's network policy blocks
// peerpush.com). Field names below are best-effort guesses at common
// REST conventions and are marked with FIXME where they'll likely need
// adjusting once real responses are available.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, "config.json");
const STATE_PATH = path.join(__dirname, "state.json");

interface Config {
  productName: string;
  baseUrl: string;
}

interface State {
  productId: string | number | null;
  lastCheckedAt: string | null;
  lastUpvoteCount: number | null;
  seenCommentIds: Array<string | number>;
}

interface Product {
  id: string | number;
  name?: string;
  title?: string;
  slug?: string;
  upvotes?: number;
  upvote_count?: number;
  votes_count?: number;
  [key: string]: unknown;
}

interface Comment {
  id: string | number;
  body?: string;
  content?: string;
  author?: string;
  author_name?: string;
  user?: { name?: string };
  created_at?: string;
  [key: string]: unknown;
}

async function loadJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf-8")) as T;
}

function authHeaders(): Record<string, string> {
  const key = process.env.PEERPUSH_API_KEY;
  if (!key) return {};
  // FIXME: confirm PeerPush's actual auth scheme (Bearer vs API-key header)
  // once network access is available. Sending both is harmless if only one applies.
  return {
    Authorization: `Bearer ${key}`,
    "X-API-Key": key,
  };
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: "application/json", ...authHeaders() } });
  if (!res.ok) {
    throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function extractItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    // FIXME: adjust to whichever envelope key PeerPush actually uses.
    for (const key of ["products", "data", "items", "results", "comments"]) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
  }
  return [];
}

function hasNextPage(payload: unknown): string | number | null {
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    // FIXME: adjust to PeerPush's actual pagination convention (cursor vs page number).
    const meta = (obj.meta ?? obj.pagination ?? obj) as Record<string, unknown>;
    if (typeof meta.next_page === "number") return meta.next_page;
    if (typeof meta.next_cursor === "string") return meta.next_cursor;
  }
  return null;
}

async function findProduct(config: Config): Promise<Product> {
  let page: string | number | null = 1;
  const seenPages = new Set<string | number>();
  while (page !== null && !seenPages.has(page)) {
    seenPages.add(page);
    const url = `${config.baseUrl}/products?page=${encodeURIComponent(String(page))}`;
    const payload = await fetchJson(url);
    const items = extractItems(payload) as Product[];
    const match = items.find((p) => {
      const name = (p.name ?? p.title ?? "").toString().toLowerCase();
      return name === config.productName.toLowerCase();
    });
    if (match) return match;
    page = hasNextPage(payload);
  }
  throw new Error(
    `No product named "${config.productName}" found in /products (checked ${seenPages.size} page(s)). ` +
      `Verify the product name/slug and the pagination handling in findProduct().`,
  );
}

async function fetchComments(config: Config, productId: string | number): Promise<Comment[]> {
  // FIXME: verify the real comments endpoint. Trying the most likely
  // REST-nested route first, falling back to an embedded field on the
  // product resource.
  try {
    const payload = await fetchJson(`${config.baseUrl}/products/${productId}/comments`);
    return extractItems(payload) as Comment[];
  } catch (err) {
    const productPayload = await fetchJson(`${config.baseUrl}/products/${productId}`);
    const obj = productPayload as Record<string, unknown>;
    if (Array.isArray(obj.comments)) return obj.comments as Comment[];
    throw new Error(
      `Could not find a comments endpoint or embedded comments field for product ${productId}: ${
        (err as Error).message
      }`,
    );
  }
}

function upvoteCount(product: Product): number {
  return Number(product.upvotes ?? product.upvote_count ?? product.votes_count ?? 0);
}

function commentText(comment: Comment): string {
  return (comment.body ?? comment.content ?? "").toString();
}

function commentAuthor(comment: Comment): string {
  return (comment.author ?? comment.author_name ?? comment.user?.name ?? "someone").toString();
}

async function main() {
  const config = await loadJson<Config>(CONFIG_PATH);
  const state = await loadJson<State>(STATE_PATH);

  const product = await findProduct(config);
  const comments = await fetchComments(config, product.id);

  const currentUpvotes = upvoteCount(product);
  const newUpvotes =
    state.lastUpvoteCount === null ? 0 : Math.max(0, currentUpvotes - state.lastUpvoteCount);

  const seen = new Set(state.seenCommentIds);
  const newComments = comments.filter((c) => !seen.has(c.id));

  const report = {
    checkedAt: new Date().toISOString(),
    product: { id: product.id, name: product.name ?? product.title, slug: product.slug },
    currentUpvotes,
    previousUpvotes: state.lastUpvoteCount,
    newUpvotes,
    newComments: newComments.map((c) => ({
      id: c.id,
      author: commentAuthor(c),
      body: commentText(c),
      createdAt: c.created_at ?? null,
    })),
  };

  const nextState: State = {
    productId: product.id,
    lastCheckedAt: report.checkedAt,
    lastUpvoteCount: currentUpvotes,
    seenCommentIds: [...seen, ...newComments.map((c) => c.id)],
  };
  await writeFile(STATE_PATH, JSON.stringify(nextState, null, 2) + "\n");

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ error: (err as Error).message }, null, 2));
  process.exit(1);
});
