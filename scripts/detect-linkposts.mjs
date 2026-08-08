#!/usr/bin/env node
// Detect linkblog-shape posts in the archive and set `link:` frontmatter.
//
// A "linkblog" post is one whose body is essentially a single outbound
// link, in the tradition of Daring Fireball / kottke.org / micro.blog.
// We detect the two dominant Posterous-import shapes:
//
//   1. Pure link: body is <a href="URL">URL</a>, optionally followed by
//      a short blurb (<p>...</p>).
//   2. Bookmarklet: body contains .posterous_bookmarklet_entry and a
//      .posterous_quote_citation "via <a href=...>host</a>" block.
//
// We do NOT rewrite the body. We only add `link:` (and set
// `topic: link`) so the templates can render a linkblog affordance.

import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import yaml from "js-yaml"

const DIR = "src/content/blogs"

function splitFrontmatter(text) {
  const src = text.replace(/^\uFEFF/, "")
  const m = src.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?([\s\S]*)$/)
  if (!m) return { data: {}, body: src, hadFm: false }
  return { data: yaml.load(m[1]) ?? {}, body: m[2], hadFm: true }
}

/**
 * Pull out a linkblog target URL, or null if the post isn't a genuine
 * Posterous-shaped linklog item. Deliberately strict:
 *
 *   1. Posterous "bookmarklet" entry (has an explicit `via` citation)
 *   2. "Pure link" shape: body starts with <a href="URL">DISPLAY</a>
 *      where DISPLAY equals URL or is a truncated prefix of URL. This
 *      is exactly what the Posterous linklog bookmarklet emitted.
 *
 * Anything else — including short narrative posts that happen to start
 * with a linked phrase — is left alone.
 */
function detectLink(body) {
  // Shape 1: Posterous bookmarklet → prefer the "via" citation link.
  if (body.includes("posterous_bookmarklet_entry")) {
    const via = body.match(
      /posterous_quote_citation[^"]*"[^>]*>\s*via\s*<a[^>]+href="([^"]+)"/i
    )
    if (via) return via[1]
    const first = body.match(/<a[^>]+href="(https?:\/\/[^"]+)"/i)
    if (first) return first[1]
    return null
  }

  // Shape 2: pure Posterous linklog. Body must begin with an anchor
  // whose visible text is (a prefix of) the href itself.
  const lead = body.match(
    /^\s*<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>\s*([^<]+?)\s*<\/a>/i
  )
  if (!lead) return null
  const href = lead[1]
  const display = lead[2].replace(/\.{3,}\s*$/, "").trim() // drop trailing ellipsis
  if (href === display || href.startsWith(display)) return href
  return null
}

const files = readdirSync(DIR).filter((f) => f.endsWith(".md"))

let updated = 0
let alreadyTagged = 0

for (const file of files) {
  const abs = join(DIR, file)
  const raw = readFileSync(abs, "utf8")
  const { data, body, hadFm } = splitFrontmatter(raw)
  if (!hadFm) continue

  if (data.link) {
    alreadyTagged++
    continue
  }

  const link = detectLink(body)
  if (!link) continue

  const clean = {
    title: data.title,
    ...(data.subtitle ? { subtitle: data.subtitle } : {}),
    date: data.date,
    topic: "link",
    link,
    ...(data.read ? { read: data.read } : {}),
    ...(data.categories ? { categories: data.categories } : {}),
    ...(data.image ? { image: data.image } : {}),
  }

  const fm = yaml.dump(clean, { lineWidth: 0, forceQuotes: false })
  const out = `---\n${fm}---\n\n${body.replace(/^\s+/, "")}`
  writeFileSync(abs, out, "utf8")
  updated++
}

console.log(
  `Tagged ${updated} link posts (${alreadyTagged} already had a link field).`
)
