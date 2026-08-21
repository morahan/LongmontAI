import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const summaryFields = ['id', 'date', 'publishAt', 'title', 'summary'] as const

function articleSummaryPlugin(): Plugin {
  return {
    name: 'longmont-article-summary',
    enforce: 'pre',
    load(id) {
      const [filePath, query = ''] = id.split('?', 2)
      if (!new URLSearchParams(query).has('summary')
          || !filePath.includes('/src/articles/')
          || !filePath.endsWith('.md')) return null

      const raw = readFileSync(filePath, 'utf8')
      const frontmatter = raw.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1]
      if (!frontmatter) throw new Error(`Article frontmatter missing: ${filePath}`)

      const values = new Map<string, string>()
      frontmatter.split('\n').forEach((line) => {
        const colon = line.indexOf(':')
        if (colon <= 0) return
        const key = line.slice(0, colon).trim()
        let value = line.slice(colon + 1).trim()
        if ((value.startsWith('"') && value.endsWith('"'))
            || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
        values.set(key, value)
      })

      const summary = Object.fromEntries(summaryFields.flatMap((field) => {
        const value = values.get(field)
        return value === undefined ? [] : [[field, value]]
      }))
      for (const required of ['id', 'date', 'title', 'summary']) {
        if (!summary[required]) throw new Error(`Article ${required} missing: ${filePath}`)
      }
      return `export default ${JSON.stringify(summary)}`
    },
  }
}

export default defineConfig({
  plugins: [articleSummaryPlugin(), react()],
})
