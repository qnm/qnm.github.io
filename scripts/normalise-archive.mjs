#!/usr/bin/env node
// Normalise the legacy .markdown / .html / .md posts in src/content/blogs
// into a consistent frontmatter shape and .md extension, so they can all
// be loaded by the Astro content collection.
//
// - Extract `date` from filename when missing (or unparseable)
// - Preserve title; fall back to a prettified slug
// - Preserve or default the `image` reference
// - Tag legacy posts with `topic: "archive"` so they don't hit the hero slot
// - Drop Jekyll/WordPress/Posterous-era junk fields
// - Rewrite each file with .md extension

import { readdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs"
import { join, extname, basename } from "node:path"
import yaml from "js-yaml"

const DIR = "src/content/blogs"
const DEFAULT_IMAGE = "../../images/tokyo.jpg"

const FILENAME_DATE = /^(\d{4})-(\d{2})-(\d{2})-(.+)$/
const ORDINAL = /(\d+)(st|nd|rd|th)/g

/** Parse a variety of human date strings into a Date, or null. */
function parseLooseDate(input) {
  if (input == null) return null
  if (input instanceof Date && !isNaN(input)) return input
  const s = String(input).replace(ORDINAL, "$1").trim()
  const d = new Date(s)
  return isNaN(d) ? null : d
}

/** Extract frontmatter + body. Supports leading BOM and trailing space on ---. */
function splitFrontmatter(text) {
  const src = text.replace(/^\uFEFF/, "")
  const m = src.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?([\s\S]*)$/)
  if (!m) return { data: {}, body: src }
  let data = {}
  try {
    data = yaml.load(m[1]) ?? {}
  } catch (err) {
    console.warn("YAML parse failed:", err.message)
  }
  return { data, body: m[2] }
}

function prettifySlug(slug) {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function iso(date) {
  return date.toISOString().slice(0, 10)
}

const files = readdirSync(DIR).filter((f) =>
  /\.(md|markdown|html)$/i.test(f)
)

let normalised = 0
let renamed = 0

for (const file of files) {
  const abs = join(DIR, file)
  const ext = extname(file).toLowerCase()
  const stem = basename(file, ext)

  const raw = readFileSync(abs, "utf8")
  const { data, body } = splitFrontmatter(raw)

  // Date: existing → filename → epoch fallback
  let date = parseLooseDate(data.date)
  const fnMatch = stem.match(FILENAME_DATE)
  const slugFromFilename = fnMatch ? fnMatch[4] : stem
  if (!date && fnMatch) {
    date = new Date(`${fnMatch[1]}-${fnMatch[2]}-${fnMatch[3]}T00:00:00Z`)
  }
  if (!date) date = new Date("1970-01-01T00:00:00Z")

  // Title: existing → prettified slug
  const title =
    (typeof data.title === "string" && data.title.trim()) ||
    prettifySlug(slugFromFilename)

  // topic: modern .md keeps whatever it had; legacy → "archive"
  let topic = data.topic
  if (!topic) {
    topic = ext === ".md" ? undefined : "archive"
  }

  // Build clean frontmatter (order matters for readability)
  const clean = {
    title,
    ...(data.subtitle ? { subtitle: data.subtitle } : {}),
    date: iso(date),
    ...(topic ? { topic } : {}),
    ...(data.read ? { read: data.read } : {}),
    ...(data.categories ? { categories: data.categories } : {}),
    image: data.image || DEFAULT_IMAGE,
  }

  const newBody = body.replace(/^\s+/, "") // strip leading blank lines
  const frontmatter = yaml.dump(clean, { lineWidth: 0, forceQuotes: false })
  const out = `---\n${frontmatter}---\n\n${newBody}`

  const targetName = `${stem}.md`
  const targetAbs = join(DIR, targetName)

  writeFileSync(targetAbs, out, "utf8")
  normalised++
  if (targetAbs !== abs) {
    unlinkSync(abs)
    renamed++
  }
}

console.log(`Normalised ${normalised} files (${renamed} renamed to .md).`)
