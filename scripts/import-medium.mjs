#!/usr/bin/env node
// Import a Medium export (https://medium.com/me/export) into
// src/content/blogs as our normalised markdown-with-frontmatter shape.
//
// Usage:
//   node scripts/import-medium.mjs <path-to-medium-export-dir>
//
// The Medium export contains a `posts/` directory of HTML files. Each
// file looks like:
//
//   <YYYY-MM-DD>_<Title-Slug>-<12hex>.html   (published)
//   draft_<Title-Slug>-<12hex>.html          (unpublished draft)
//
// We:
//   - Skip Medium "replies" (posts with no <section data-field="subtitle">
//     — those are exported comments, not standalone posts).
//   - Extract title, subtitle, published datetime, canonical URL.
//   - Extract the article body from <section data-field="body">.
//   - Strip the redundant leading <h3> that Medium injects to duplicate
//     the title inside the body.
//   - Run turndown (GFM) over the cleaned body to produce markdown.
//   - Write out src/content/blogs/YYYY-MM-DD-<slug>.md with frontmatter
//     matching the existing content collection schema. Drafts get
//     `draft: true` and a `1970-01-01` date until you publish them.
//
// Images are left as remote references to Medium's CDN. If you want to
// self-host them, add a follow-up script.

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import { join, basename, resolve } from "node:path"
import yaml from "js-yaml"
import TurndownService from "turndown"
import { gfm } from "turndown-plugin-gfm"
import he from "he"

const OUT_DIR = "src/content/blogs"

const input = process.argv[2]
if (!input) {
  console.error("Usage: node scripts/import-medium.mjs <medium-export-dir>")
  process.exit(1)
}

const postsDir = existsSync(join(input, "posts"))
  ? join(input, "posts")
  : input
if (!existsSync(postsDir)) {
  console.error(`No such directory: ${postsDir}`)
  process.exit(1)
}

const td = new TurndownService({
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "_",
  linkStyle: "inlined",
})
td.use(gfm)

// Autolink form for anchors where text == href.
td.addRule("autolink", {
  filter: (node) =>
    node.nodeName === "A" &&
    node.getAttribute("href") &&
    node.textContent.trim() === node.getAttribute("href").trim(),
  replacement: (_c, node) => `<${node.getAttribute("href")}>`,
})

// Medium's <figure><img><figcaption> → markdown image with caption paragraph.
td.addRule("figure", {
  filter: "figure",
  replacement: (_content, node) => {
    const img = node.querySelector("img")
    const caption = node.querySelector("figcaption")
    if (!img) return ""
    const src = img.getAttribute("src") || ""
    const alt = (img.getAttribute("alt") || "").replace(/\s+/g, " ").trim()
    const cap = caption ? caption.textContent.replace(/\s+/g, " ").trim() : ""
    const line = `![${alt || cap}](${src})`
    return cap ? `\n\n${line}\n\n_${cap}_\n\n` : `\n\n${line}\n\n`
  },
})

/** Grab the innerHTML of the first element matching a simple opener regex. */
function pluck(html, openRe) {
  const m = html.match(openRe)
  if (!m) return null
  const start = m.index + m[0].length
  // Walk the tag name we just opened, counting nesting depth.
  const tag = m[1]
  const openTag = new RegExp(`<${tag}\\b`, "gi")
  const closeTag = new RegExp(`</${tag}\\s*>`, "gi")
  openTag.lastIndex = start
  closeTag.lastIndex = start
  let depth = 1
  let idx = start
  while (depth > 0) {
    openTag.lastIndex = idx
    closeTag.lastIndex = idx
    const o = openTag.exec(html)
    const c = closeTag.exec(html)
    if (!c) return null
    if (o && o.index < c.index) {
      depth++
      idx = o.index + o[0].length
    } else {
      depth--
      idx = c.index + c[0].length
      if (depth === 0) return html.slice(start, c.index)
    }
  }
  return null
}

function firstMatch(re, html) {
  const m = html.match(re)
  return m ? m[1] : null
}

function slugFromCanonical(url, fallback) {
  if (url) {
    // https://medium.com/@qnm/some-title-abc123def456
    const m = url.match(/\/([^\/]+)$/)
    if (m) {
      // Strip trailing 12-hex Medium id, if any.
      return m[1].replace(/-[a-f0-9]{12}$/i, "")
    }
  }
  return fallback
}

function stripLeadingTitleH3(bodyHtml, title) {
  if (!title) return bodyHtml
  const norm = (s) => he.decode(s).replace(/\s+/g, " ").trim().toLowerCase()
  const t = norm(title)
  return bodyHtml.replace(
    /^\s*(?:<section[^>]*>\s*(?:<div[^>]*>\s*)*)?<h3[^>]*>([\s\S]*?)<\/h3>/i,
    (whole, inner) => (norm(inner) === t ? whole.slice(0, -0).replace(/<h3[^>]*>[\s\S]*?<\/h3>/i, "") : whole)
  )
}

function postclean(md) {
  return (
    md
      .replace(/&(#\d+|[a-z]+);/gi, (m) => he.decode(m))
      .split("\n")
      .map((l) => l.replace(/[ \t]+$/, ""))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n"
  )
}

function iso(dateStr) {
  const d = new Date(dateStr)
  return isNaN(d) ? null : d.toISOString().slice(0, 10)
}

const files = readdirSync(postsDir).filter((f) => f.endsWith(".html"))

let written = 0
let skippedReplies = 0
let skippedExisting = 0

for (const file of files) {
  const abs = join(postsDir, file)
  const html = readFileSync(abs, "utf8")
  const isDraft = /^draft_/i.test(file)

  const title = firstMatch(
    /<h1[^>]*class="[^"]*p-name[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
    html
  )
  if (!title) {
    console.warn(`! ${file}: no <h1 class="p-name"> — skipping`)
    continue
  }
  const titleText = he.decode(title.replace(/<[^>]+>/g, "")).trim()

  // Replies have no p-summary section.
  const subtitleMatch = html.match(
    /<section[^>]*data-field="subtitle"[^>]*class="[^"]*p-summary[^"]*"[^>]*>([\s\S]*?)<\/section>/i
  )
  if (!subtitleMatch) {
    console.log(`  skip reply: ${file}`)
    skippedReplies++
    continue
  }
  const subtitleText = he
    .decode(subtitleMatch[1].replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim()

  const datetime = firstMatch(
    /<time[^>]*class="[^"]*dt-published[^"]*"[^>]*datetime="([^"]+)"/i,
    html
  )
  const canonical = firstMatch(
    /<a[^>]*href="([^"]+)"[^>]*class="[^"]*p-canonical[^"]*"/i,
    html
  )

  const date = isDraft
    ? "1970-01-01"
    : iso(datetime) || file.slice(0, 10)

  const slug = slugFromCanonical(
    canonical,
    basename(file, ".html")
      .replace(/^\d{4}-\d{2}-\d{2}_/, "")
      .replace(/^draft_/, "")
      .replace(/-[a-f0-9]{12}$/i, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  )

  const outName = `${date}-${slug}.md`
  const outPath = join(OUT_DIR, outName)
  if (existsSync(outPath)) {
    console.log(`  skip existing: ${outName}`)
    skippedExisting++
    continue
  }

  let bodyHtml = pluck(
    html,
    /<(section)\b[^>]*data-field="body"[^>]*>/i
  )
  if (!bodyHtml) {
    console.warn(`! ${file}: no body section — skipping`)
    continue
  }

  // Drop Medium's section dividers (leading HR bar at top of every section).
  bodyHtml = bodyHtml.replace(
    /<div class="section-divider">[\s\S]*?<\/div>/gi,
    ""
  )
  // Remove the leading H3 that duplicates the title.
  bodyHtml = stripLeadingTitleH3(bodyHtml, titleText)

  const md = postclean(td.turndown(bodyHtml))

  const fm = {
    title: titleText,
    ...(subtitleText ? { subtitle: subtitleText } : {}),
    date,
    ...(canonical ? { canonical } : {}),
    ...(isDraft ? { draft: true } : {}),
  }

  const yml = yaml.dump(fm, { lineWidth: 0, forceQuotes: false })
  writeFileSync(outPath, `---\n${yml}---\n\n${md}`, "utf8")
  console.log(`✓ ${outName}`)
  written++
}

console.log(
  `\nWrote ${written} files, skipped ${skippedReplies} replies, ${skippedExisting} already-existing.`
)
