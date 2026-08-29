import { defineCollection, z } from "astro:content"
import { glob } from "astro/loaders"

const blog = defineCollection({
  loader: glob({
    pattern: ["**/*.md"],
    base: "./src/content/blogs",
  }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    date: z.coerce.date(),
    read: z.string().optional(),
    topic: z.string().optional(),
    categories: z.string().optional(),
    link: z.string().url().optional(),
    canonical: z.string().url().optional(),
    draft: z.boolean().optional(),
    featured: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    // Nostr provenance for imported highlights (kind 9802).
    nostr: z.string().optional(), // nevent1… (nip-19 encoded event pointer)
    nostrId: z.string().optional(), // raw hex event id
    nostrAuthor: z.string().optional(), // npub1…
    nostrKind: z.number().optional(),
    comment: z.string().optional(), // highlighter's own note, if any
  }),
})

export const collections = { blog }
