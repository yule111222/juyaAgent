import { query } from '@anthropic-ai/claude-agent-sdk'

const apiKey = process.env.MINIMAX_API_KEY || ''
const baseUrl = 'https://api.minimaxi.com/anthropic'
const model = 'MiniMax-M2.1'

async function test() {
  console.log('测试 Claude Agent SDK...')
  console.log('API Key:', apiKey.substring(0, 10) + '...')
  console.log('Base URL:', baseUrl)
  console.log('Model:', model)

  const q = query({
    prompt: '你好，请简单介绍一下你自己',
    options: {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: apiKey,
        ANTHROPIC_BASE_URL: baseUrl,
        ANTHROPIC_MODEL: model
      },
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true
    }
  })

  console.log('Query created, iterating...')

  for await (const message of q) {
    console.log('\n=== Message type:', message.type, '===')

    if (message.type === 'content' && 'content' in message) {
      for (const block of (message as any).content) {
        console.log('Block type:', block.type)
        if (block.type === 'text') {
          console.log('Text:', block.text)
        }
      }
    }

    if (message.type === 'result') {
      console.log('Result:', JSON.stringify(message, null, 2))
    }

    if (message.type === 'assistant') {
      console.log('Assistant:', JSON.stringify(message, null, 2))
    }
  }

  console.log('\nDone!')
}

test().catch(console.error)
