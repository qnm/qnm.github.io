import { defineCollection, z } from "astro:content"
import { glob } from "astro/loaders"

// Only load the modern .md posts for now. The archive of legacy
// .markdown / .html files in src/content/blogs/ remains on disk but is
// deliberately excluded until we normalise their frontmatter.
const blog = defineCollection({
  loader: glob({
    pattern: ["**/*.md"],
    base: "./src/content/blogs",
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      date: z.union([z.string(), z.date()]).optional(),
      read: z.string().optional(),
      topic: z.string().optional(),
      categories: z.string().optional(),
      image: image().optional(),
    }),
})

export const collections = { blog }
