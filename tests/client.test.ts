import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { McpTestClient } from './McpClient.js'

// Resolve the CLI entry point path dynamically
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// Go up three levels from test/ -> test-utils/ -> packages/ -> mcpn/
// Then down to packages/cli/bin/mcpn.mjs
const cliEntryPointPath = path.resolve(__dirname, '../bin/cli.mjs')

describe('mCP Client Tests', () => {
  let client: McpTestClient

  beforeEach(() => {
    console.log('cliEntryPointPath', cliEntryPointPath)

    client = new McpTestClient({
      cliEntryPoint: cliEntryPointPath, // Use the dynamically resolved path
    })
  })

  afterEach(async () => {
    try {
      await client.close()
    }
    catch (error) {
      console.error('Error closing client:', error)
    }
  })

  it('should connect to server with default configuration', async () => {
    await client.connectServer()
    const tools = await client.listTools()

    // When no args provided, default preset is "thinking", so it should include generate_thought
    expect(Array.isArray(tools.tools)).toBe(true)
    const toolNames = tools.tools.map((t: any) => t.name)
    console.log('Available tools:', toolNames)
    expect(toolNames).toContain('deepwiki_fetch')
  })
})

describe('deepWiki Tool Tests', () => {
  let client: McpTestClient

  beforeEach(() => {
    // Resolve the CLI entry point path dynamically
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)

    client = new McpTestClient({
      cliEntryPoint: cliEntryPointPath,
    })
  })

  afterEach(async () => {
    try {
      await client.close()
    }
    catch (error) {
      console.error('Error closing client:', error)
    }
  })

  it('should fetch content from a deepwiki.com URL', async () => {
    await client.connectServer() // Connect with default settings

    // Verify deepwiki.fetch tool is available
    const tools = await client.listTools()
    const toolNames = tools.tools.map((t: any) => t.name)
    expect(toolNames).toContain('deepwiki_fetch')

    // Call the deepwiki_fetch tool
    const result = await client.callTool('deepwiki_fetch', {
      url: 'https://deepwiki.com/antiwork/gumroad/3.1-navigation-components',
      maxDepth: 1,
      mode: 'pages',
    })

    console.log('deepwiki.fetch result:', JSON.stringify(result, null, 2))

    expect(result.content[0].text).toMatch(/navigation-components/)
  }, 30000) // Increase timeout for network request

  it('should return error for non-deepwiki.com URL', async () => {
    await client.connectServer()

    await expect(client.callTool('deepwiki_fetch', {
      url: 'https://example.com/some/path',
      maxDepth: 0,
    })).rejects.toMatchObject({
      code: -32602,
      message: expect.stringMatching(/Only deepwiki\.com domains are allowed|Request failed schema validation/),
    })
  })

  it('should return validation error for missing URL', async () => {
    await client.connectServer()

    await expect(client.callTool('deepwiki_fetch', {
      maxDepth: 1,
      mode: 'pages',
    })).rejects.toMatchObject({
      code: -32602,
      message: expect.stringMatching(/Request failed schema validation|Missing required property: url/),
    })
  })
})
