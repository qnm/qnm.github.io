import { defineCollection, z } from "astro:content"
import { glob } from "astro/loaders"

const blog = defineCollection({
  loader: glob({
    pattern: ["**/*.md"],
    base: "./src/content/blogs",
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      date: z.coerce.date(),
      read: z.string().optional(),
      topic: z.string().optional(),
      categories: z.string().optional(),
      link: z.string().url().optional(),
      image: image().optional(),
    }),
})

export const collections = { blog }
