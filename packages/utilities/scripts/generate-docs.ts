import * as fs from 'fs-extra'
import {
  createCategories,
  parseExportedFunctionsAsync,
  renderFunctionDataToMarkdown
} from 'generate-ts-docs'
import * as path from 'path'

const rootDirectoryPath = path.resolve(__dirname, '..', '..', '..')
const tsconfigFilePath = path.join(rootDirectoryPath, 'tsconfig.shared.json')
const outputFilePath = path.join(rootDirectoryPath, 'docs', 'utilities.md')

async function main() {
  const lines: Array<string> = []
  const functionsData = await parseExportedFunctionsAsync(['./src/**/*.ts'], {
    tsconfigFilePath
  })
  const categories = createCategories(functionsData)
  lines.push('# Utilities')
  lines.push('')
  lines.push(
    '`@create-figma-plugin/utilities` is a library of helpful utility functions for common Figma plugin operations.'
  )
  lines.push('')
  lines.push('```')
  lines.push('$ npm install @create-figma-plugin/utilities')
  lines.push('```')
  lines.push('')
  for (const category of categories) {
    lines.push(`## ${category.name}`)
    lines.push('')
    lines.push('```ts')
    lines.push('import {')
    const functionNames: Array<string> = []
    for (const { name } of category.functionsData) {
      functionNames.push(`  ${name}`)
    }
    lines.push(functionNames.join(',\n'))
    lines.push("} from '@create-figma-plugin/utilities'")
    lines.push('```')
    lines.push('')
    for (const functionData of category.functionsData) {
      lines.push(
        renderFunctionDataToMarkdown(functionData, {
          headerLevel: 3
        })
      )
    }
    lines.push('')
  }
  await fs.outputFile(outputFilePath, lines.join('\n').trim())
}
main()
