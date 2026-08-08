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
  }),
})

export const collections = { blog }
