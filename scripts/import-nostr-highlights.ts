#!/usr/bin/env node
// Import Nostr highlights (NIP-84, kind 9802) authored by a given pubkey
// into src/content/blogs as our normalised markdown-with-frontmatter shape.
//
// Inspired by https://github.com/canostrical/blogsync — each highlight
// becomes a small "highlight" post that quotes the highlighted text and
// links back to both the original source and the Nostr event.
//
// Usage:
//   node scripts/import-nostr-highlights.ts <npub-or-hex-pubkey> [--relay wss://…]…
//
// Examples:
//   node scripts/import-nostr-highlights.ts npub1… --dry-run
//   NOSTR_PUBKEY=cdb0…ccf node scripts/import-nostr-highlights.ts
//
// Flags:
//   --relay <url>   Add a relay (repeatable). Defaults to a sensible set.
//   --since <YYYY-MM-DD>  Only import highlights created on/after this date.
//   --timeout <sec> Max time to wait for relays (default 15).
//   --dry-run       Print what would be written without touching disk.
//
// Uses nostr-tools (fiatjaf's reference toolkit) for relay I/O and
// NIP-19 encoding.
//
// Runs on Node ≥ 22 via built-in TypeScript type stripping. No build step.

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import yaml from "js-yaml"
import WebSocket from "ws"
import { SimplePool, useWebSocketImplementation } from "nostr-tools/pool"
import { nip19 } from "nostr-tools"
import type { Event as NostrEvent } from "nostr-tools"

// nostr-tools needs a WebSocket implementation in Node.
useWebSocketImplementation(WebSocket)

const OUT_DIR = "src/content/blogs"
const HIGHLIGHT_KIND = 9802 // NIP-84 highlight
const BOOKMARK_KIND = 39701 // NIP-B0 web bookmark (addressable)
const KINDS = [HIGHLIGHT_KIND, BOOKMARK_KIND]

const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
  "wss://relay.primal.net",
  "wss://nostr.wine",
]

// ── args ──────────────────────────────────────────────────────────────
interface Args {
  pubkey: string
  relays: string[]
  since?: number
  timeoutMs: number
  dryRun: boolean
}

function parseArgs(argv: string[]): Args {
  const relays: string[] = []
  let pubkey = process.env.NOSTR_PUBKEY ?? ""
  let since: number | undefined
  let timeoutMs = 15_000
  let dryRun = false

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--relay") {
      relays.push(argv[++i])
    } else if (a === "--since") {
      const d = new Date(argv[++i])
      if (isNaN(+d)) throw new Error(`Invalid --since date`)
      since = Math.floor(+d / 1000)
    } else if (a === "--timeout") {
      const sec = Number(argv[++i])
      if (!Number.isFinite(sec) || sec <= 0) throw new Error(`Invalid --timeout`)
      timeoutMs = sec * 1000
    } else if (a === "--dry-run") {
      dryRun = true
    } else if (!a.startsWith("--") && !pubkey) {
      pubkey = a
    } else {
      throw new Error(`Unknown argument: ${a}`)
    }
  }

  if (!pubkey) {
    throw new Error(
      "Provide a pubkey (npub… or hex) as an argument or via NOSTR_PUBKEY."
    )
  }

  return {
    pubkey: toHexPubkey(pubkey),
    relays: relays.length ? relays : DEFAULT_RELAYS,
    since,
    timeoutMs,
    dryRun,
  }
}

/**
 * Collect events matching `filter` from `relays`, resolving when every
 * relay has sent EOSE or when `timeoutMs` elapses — whichever comes
 * first. This avoids hanging forever on unreachable relays.
 */
function collect(
  pool: SimplePool,
  relays: string[],
  filter: Record<string, unknown>,
  timeoutMs: number
): Promise<NostrEvent[]> {
  return new Promise((resolve) => {
    const events: NostrEvent[] = []
    let done = false
    const finish = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      try {
        sub.close()
      } catch {}
      resolve(events)
    }
    const timer = setTimeout(finish, timeoutMs)
    const sub = pool.subscribeManyEose(relays, filter as never, {
      onevent: (ev: NostrEvent) => events.push(ev),
      onclose: finish,
    })
  })
}

/** Accept an npub1… or a 64-char hex pubkey and return hex. */
function toHexPubkey(input: string): string {
  const s = input.trim()
  if (/^[0-9a-f]{64}$/i.test(s)) return s.toLowerCase()
  if (s.startsWith("npub1")) {
    const { type, data } = nip19.decode(s)
    if (type !== "npub") throw new Error(`Not an npub: ${s}`)
    return data as string
  }
  throw new Error(`Unrecognised pubkey format: ${s}`)
}

// ── helpers ───────────────────────────────────────────────────────────
function tagValue(ev: NostrEvent, name: string): string | undefined {
  const t = ev.tags.find((t) => t[0] === name)
  return t?.[1]
}

function tagValues(ev: NostrEvent, name: string): string[] {
  return ev.tags.filter((t) => t[0] === name).map((t) => t[1]).filter(Boolean)
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['"“”‘’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
    .replace(/-$/g, "")
}

function displayHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "")
  } catch {
    return ""
  }
}

/** Turn multi-line highlight content into a markdown blockquote. */
function blockquote(text: string): string {
  return text
    .trim()
    .split("\n")
    .map((line) => (line.trim() ? `> ${line}` : ">"))
    .join("\n")
}

/** Derive a concise title from the highlighted text. */
function deriveTitle(content: string, sourceUrl?: string): string {
  const flat = content.replace(/\s+/g, " ").trim()
  if (!flat) return sourceUrl ? `Highlight from ${displayHost(sourceUrl)}` : "Highlight"
  const words = flat.split(" ")
  let title = ""
  for (const w of words) {
    if ((title + " " + w).trim().length > 70) break
    title = (title + " " + w).trim()
  }
  if (title.length < flat.length) title += "…"
  return title
}

/** Humanise a title from a URL's last path segment, e.g.
 *  ".../we-should-be-more-tired/" → "We should be more tired". */
function titleFromUrl(url: string): string {
  try {
    const u = new URL(url)
    const segs = u.pathname.split("/").filter(Boolean)
    const last = segs[segs.length - 1] || u.host.replace(/^www\./, "")
    const words = decodeURIComponent(last)
      .replace(/\.(html?|php|aspx?)$/i, "")
      .replace(/[-_]+/g, " ")
      .trim()
    if (!words) return ""
    return words.charAt(0).toUpperCase() + words.slice(1)
  } catch {
    return ""
  }
}

/** Normalise a URL for dedup: drop scheme, trailing slash, lowercase. */
function normaliseUrl(u: string): string {
  return u
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase()
}

/** NIP-19 pointer: naddr for addressable events, nevent otherwise. */
function nostrPointer(ev: NostrEvent, relays: string[]): string {
  const relayHints = relays.slice(0, 2)
  if (ev.kind >= 30000 && ev.kind < 40000) {
    return nip19.naddrEncode({
      identifier: tagValue(ev, "d") ?? "",
      pubkey: ev.pubkey,
      kind: ev.kind,
      relays: relayHints,
    })
  }
  return nip19.neventEncode({
    id: ev.id,
    author: ev.pubkey,
    kind: ev.kind,
    relays: relayHints,
  })
}

interface Built {
  outName: string
  fm: Record<string, unknown>
  body: string
  link?: string
}

/** A NIP-84 highlight (kind 9802) → a `topic: highlight` post. */
function buildHighlight(ev: NostrEvent, relays: string[]): Built {
  // Source: web pages use the "r" tag; nostr sources use "a"/"e".
  const sourceUrl = tagValues(ev, "r").find((u) => /^https?:\/\//.test(u))
  const comment = tagValue(ev, "comment")
  const hashtags = tagValues(ev, "t").map((t) => t.replace(/^#/, ""))
  const content = ev.content ?? ""
  const date = new Date(ev.created_at * 1000).toISOString().slice(0, 10)
  const title = deriveTitle(content, sourceUrl)
  const slug = slugify(title) || ev.id.slice(0, 8)
  const outName = `${date}-${slug}-${ev.id.slice(0, 8)}.md`

  const fm: Record<string, unknown> = {
    title,
    date,
    topic: "highlight",
    ...(sourceUrl ? { link: sourceUrl } : {}),
    nostr: nostrPointer(ev, relays),
    nostrId: ev.id,
    nostrAuthor: nip19.npubEncode(ev.pubkey),
    nostrKind: ev.kind,
    ...(comment ? { comment } : {}),
    ...(hashtags.length ? { tags: hashtags } : {}),
  }

  const parts = [blockquote(content)]
  if (comment) parts.push(comment.trim())
  return { outName, fm, body: parts.join("\n\n").trim() + "\n", link: sourceUrl }
}

/** A NIP-B0 web bookmark (kind 39701) → a `topic: link` post.
 *  The "d" tag holds the URL with the scheme stripped; content is an
 *  optional markdown note. */
function buildBookmark(ev: NostrEvent, relays: string[]): Built | null {
  const d = tagValue(ev, "d")
  if (!d) return null
  const url = /^https?:\/\//i.test(d) ? d : `https://${d}`
  const publishedAt = Number(tagValue(ev, "published_at"))
  const ts = Number.isFinite(publishedAt) && publishedAt > 0 ? publishedAt : ev.created_at
  const date = new Date(ts * 1000).toISOString().slice(0, 10)
  const hashtags = tagValues(ev, "t").map((t) => t.replace(/^#/, ""))
  const title =
    tagValue(ev, "title")?.trim() ||
    titleFromUrl(url) ||
    displayHost(url) ||
    "Bookmark"
  const summary = tagValue(ev, "summary")?.trim()
  const content = (ev.content ?? "").trim()
  const slug = slugify(title) || ev.id.slice(0, 8)
  const outName = `${date}-${slug}-${ev.id.slice(0, 8)}.md`

  const fm: Record<string, unknown> = {
    title,
    date,
    topic: "link",
    link: url,
    nostr: nostrPointer(ev, relays),
    nostrId: ev.id,
    nostrAuthor: nip19.npubEncode(ev.pubkey),
    nostrKind: ev.kind,
    ...(hashtags.length ? { tags: hashtags } : {}),
  }

  const body = (content || summary || "").trim()
  return { outName, fm, body: body ? body + "\n" : "", link: url }
}

interface Existing {
  ids: Set<string>
  bookmarkLinks: Set<string>
}

/** Scan already-imported posts so re-runs are idempotent. Highlights
 *  dedup by event id; bookmarks (which are editable/replaceable) dedup
 *  by URL, but only against posts we previously imported from nostr. */
function scanExisting(): Existing {
  const ids = new Set<string>()
  const bookmarkLinks = new Set<string>()
  if (!existsSync(OUT_DIR)) return { ids, bookmarkLinks }
  for (const f of readdirSync(OUT_DIR)) {
    if (!f.endsWith(".md")) continue
    const text = readFileSync(join(OUT_DIR, f), "utf8")
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    if (!m) continue
    let data: Record<string, unknown> | undefined
    try {
      data = yaml.load(m[1]) as Record<string, unknown>
    } catch {
      continue
    }
    if (!data || typeof data !== "object") continue
    if (typeof data.nostrId === "string") ids.add(data.nostrId)
    if (data.nostrKind && typeof data.link === "string") {
      bookmarkLinks.add(normaliseUrl(data.link))
    }
  }
  return { ids, bookmarkLinks }
}

// ── main ──────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2))
  const npub = nip19.npubEncode(args.pubkey)

  console.error(`Fetching kinds ${KINDS.join(", ")} (highlights + bookmarks) for ${npub}`)
  console.error(`Relays: ${args.relays.join(", ")}`)

  const pool = new SimplePool()
  const filter: {
    kinds: number[]
    authors: string[]
    since?: number
  } = { kinds: KINDS, authors: [args.pubkey] }
  if (args.since) filter.since = args.since

  let events: NostrEvent[]
  try {
    events = await collect(pool, args.relays, filter, args.timeoutMs)
  } finally {
    pool.close(args.relays)
  }

  // Dedup by event id across relays, newest first.
  const byId = new Map<string, NostrEvent>()
  for (const ev of events) if (!byId.has(ev.id)) byId.set(ev.id, ev)
  const unique = [...byId.values()].sort((a, b) => b.created_at - a.created_at)

  console.error(`Found ${unique.length} unique event(s).`)

  if (!args.dryRun && !existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

  const existing = scanExisting()
  let written = 0
  let skipped = 0

  for (const ev of unique) {
    const built =
      ev.kind === BOOKMARK_KIND
        ? buildBookmark(ev, args.relays)
        : buildHighlight(ev, args.relays)
    if (!built) {
      skipped++
      continue
    }

    // Idempotency: skip by event id, by bookmark URL, or existing file.
    const linkKey = built.link ? normaliseUrl(built.link) : undefined
    if (
      existing.ids.has(ev.id) ||
      (ev.kind === BOOKMARK_KIND && linkKey && existing.bookmarkLinks.has(linkKey)) ||
      existsSync(join(OUT_DIR, built.outName))
    ) {
      skipped++
      continue
    }

    const yml = yaml.dump(built.fm, { lineWidth: 0, forceQuotes: false })
    const file = `---\n${yml}---\n\n${built.body}`

    if (args.dryRun) {
      console.error(`\n── ${built.outName} ──`)
      console.error(file)
    } else {
      writeFileSync(join(OUT_DIR, built.outName), file, "utf8")
      console.error(`✓ ${built.outName}`)
    }

    // Track within this run too (relays may return edited duplicates).
    existing.ids.add(ev.id)
    if (ev.kind === BOOKMARK_KIND && linkKey) existing.bookmarkLinks.add(linkKey)
    written++
  }

  console.error(
    `\n${args.dryRun ? "[dry-run] " : ""}Wrote ${written}, skipped ${skipped} already-imported.`
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  })
