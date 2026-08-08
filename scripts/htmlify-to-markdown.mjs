#!/usr/bin/env node
// Convert the HTML-bodied archive posts in src/content/blogs to
// CommonMark. Runs after normalise-archive.mjs and detect-linkposts.mjs.
//
// Guarantees:
// - Skips files whose bodies contain no HTML tags (i.e. leaves any
//   hand-written markdown post byte-for-byte untouched).
// - For linkposts, strips the redundant leading anchor that echoes
//   the `link:` frontmatter URL.
// - Drops dead files.posterous.com / posterous.com/getfile image
//   references (Posterous shut down in 2013).
// - Unwraps Posterous-specific div/blockquote class wrappers.
// - Runs turndown (GFM) on what remains.

import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import yaml from "js-yaml"
import TurndownService from "turndown"
import { gfm } from "turndown-plugin-gfm"
import he from "he"

const DIR = "src/content/blogs"

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
    // display text collapses to same value as href
    node.textContent.trim() === node.getAttribute("href").trim(),
  replacement: (_content, node) => `<${node.getAttribute("href")}>`,
})

function splitFrontmatter(text) {
  const src = text.replace(/^\uFEFF/, "")
  const m = src.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?([\s\S]*)$/)
  if (!m) return null
  return { data: yaml.load(m[1]) ?? {}, body: m[2] }
}

function hasHtml(body) {
  // If there's no `<letter` sequence, treat as already-markdown.
  return /<[a-z!/][^>]*>/i.test(body)
}

function preclean(body, link) {
  let s = body

  // 1. Strip redundant leading anchor whose href matches the linkpost target.
  //    Handles trailing whitespace / trailing <p>blurb</p>.
  if (link) {
    const escaped = link.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    s = s.replace(
      new RegExp(`^\\s*<a[^>]+href="${escaped}"[^>]*>[\\s\\S]*?</a>\\s*`, "i"),
      ""
    )
    // Also drop truncated-display variants like href="X" >X...</a>
    // where display text is a shortened prefix of link, if it's the very
    // first anchor and shape looks like the pure-link Posterous export.
    s = s.replace(
      /^\s*<a[^>]+href="https?:\/\/[^"]+"[^>]*>https?:\/\/[^<]{0,120}<\/a>\s*/i,
      ""
    )
  }

  // 2. Drop dead Posterous image references (both <img> and <a><img>).
  s = s.replace(
    /<a[^>]+href="[^"]*(?:files\.posterous\.com|posterous\.com\/getfile)[^"]*"[^>]*>[\s\S]*?<\/a>/gi,
    ""
  )
  s = s.replace(
    /<img[^>]+src="[^"]*(?:files\.posterous\.com|posterous\.com\/getfile)[^"]*"[^>]*\/?>/gi,
    ""
  )

  // 3. Unwrap Posterous-specific wrappers, keeping inner content.
  s = s
    .replace(/<div class="posterous_bookmarklet_entry">/gi, "")
    .replace(/<div class='p_embed p_image_embed'>/gi, "")
    .replace(/<div class="posterous_quote_citation">/gi, "<p>")
    .replace(/<blockquote class="posterous_short_quote">/gi, "<blockquote>")
    .replace(/<blockquote class="posterous_medium_quote">/gi, "<blockquote>")

  // 4. `<p />` self-closing artefacts → paragraph break.
  s = s.replace(/<p\s*\/>/gi, "</p><p>")

  // 5. Collapse repeated non-breaking spaces used for code indentation.
  s = s.replace(/(?:&nbsp;){2,}/g, (m) => " ".repeat(m.split(";").length - 1))

  return s
}

function postclean(md) {
  return (
    md
      // Decode any entities that survived (turndown decodes most).
      .replace(/&(#\d+|[a-z]+);/gi, (m) => he.decode(m))
      // Trim per-line trailing whitespace.
      .split("\n")
      .map((l) => l.replace(/[ \t]+$/, ""))
      .join("\n")
      // Collapse 3+ blank lines to 2.
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n"
  )
}

const files = readdirSync(DIR).filter((f) => f.endsWith(".md"))

let converted = 0
let skipped = 0

for (const file of files) {
  const abs = join(DIR, file)
  const raw = readFileSync(abs, "utf8")
  const parsed = splitFrontmatter(raw)
  if (!parsed) {
    skipped++
    continue
  }

  const { data, body } = parsed
  if (!hasHtml(body)) {
    skipped++
    continue
  }

  const pre = preclean(body, data.link)
  let md
  try {
    md = td.turndown(pre)
  } catch (err) {
    console.warn(`turndown failed on ${file}: ${err.message}`)
    skipped++
    continue
  }
  md = postclean(md)

  const fm = yaml.dump(data, { lineWidth: 0, forceQuotes: false })
  const out = `---\n${fm}---\n\n${md}`
  writeFileSync(abs, out, "utf8")
  converted++
}

console.log(`Converted ${converted} files, skipped ${skipped}.`)
