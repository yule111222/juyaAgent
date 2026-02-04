/**
 * YouTube AI早报提取工具
 * 自动获取 @imjuya 最新视频字幕，提取新闻并生成Markdown
 */

import 'dotenv/config'
import { query } from '@anthropic-ai/claude-agent-sdk'
import * as youtube from './youtube'
import type { VideoInfo } from './types'

// 配置
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || ''
const YOUTUBE_CHANNEL = process.env.YOUTUBE_CHANNEL || 'https://www.youtube.com/@imjuya'
const OUTPUT_DIR = process.cwd()

/**
 * 构建新闻提取提示词
 */
function buildNewsPrompt(title: string, url: string, subtitle: string): string {
  return `你是一个新闻提取助手。请从以下AI早报字幕中提取新闻信息。

## 内容信息
- 标题: ${title}
- 链接: ${url}

## 任务
从字幕中提取所有新闻，每条新闻需要：
1. **标题**: 简洁概括新闻主题（不超过30字）
2. **内容总结**: 不超过150字的简要总结

## 字幕内容
${subtitle}

## 输出要求
请直接输出Markdown格式：

# ${title}

**链接**: ${url}

---

## 新闻列表

### 新闻1: <标题>

<内容总结，不超过150字>

### 新闻2: <标题>

<内容总结，不超过150字>

...

请提取所有有价值的新闻信息，如果没有找到新闻请说明"未检测到新闻内容"。`
}

/**
 * 保存Markdown
 */
async function saveMarkdown(filename: string, content: string): Promise<string> {
  const { promises: fs } = await import('fs')
  const path = await import('path')

  const safeFilename = filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)

  const filePath = path.join(OUTPUT_DIR, `${safeFilename}.md`)
  await fs.writeFile(filePath, content, 'utf-8')

  return filePath
}

/**
 * 调用Minimax提取新闻
 */
async function extractNews(title: string, url: string, subtitle: string): Promise<string | null> {
  try {
    const q = query({
      prompt: buildNewsPrompt(title, url, subtitle),
      options: {
        cwd: process.cwd(),
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: MINIMAX_API_KEY,
          ANTHROPIC_BASE_URL: 'https://api.minimaxi.com/anthropic',
          ANTHROPIC_MODEL: 'MiniMax-M2.1'
        },
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true
      }
    })

    let result = ''
    let assistantText = ''

    for await (const message of q) {
      // 处理 assistant 类型的消息
      if (message.type === 'assistant' && 'message' in message) {
        const msg = message.message as any
        if (msg.content && Array.isArray(msg.content)) {
          for (const block of msg.content) {
            if (block.type === 'text' && block.text) {
              assistantText += block.text
            }
          }
        }
      }

      // 处理 result 类型的消息（最终结果）
      if (message.type === 'result' && 'result' in message) {
        const res = message as any
        if (res.result && typeof res.result === 'string') {
          result = res.result
        }
      }
    }

    // 优先使用 result，如果没有则使用 assistantText
    return result || assistantText || null
  } catch (error) {
    console.error('   AI调用失败:', error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * 主流程
 */
async function main() {
  console.log('='.repeat(50))
  console.log('  YouTube AI早报提取工具')
  console.log('='.repeat(50))
  console.log(`   频道: ${YOUTUBE_CHANNEL}`)
  console.log()

  // 1. 获取最新视频
  console.log('[1/4] 获取最新视频列表...')
  const videos = await youtube.getLatestVideos(YOUTUBE_CHANNEL, 5)

  if (videos.length === 0) {
    console.error('❌ 未找到视频')
    process.exit(1)
  }

  console.log(`   找到 ${videos.length} 个视频`)
  console.log()

  // 2. 过滤AI早报视频
  console.log('[2/4] 筛选AI早报视频...')
  const aiVideos = videos.filter(v =>
    v.title.toLowerCase().includes('ai daily briefing') ||
    v.title.toLowerCase().includes('ai早报') ||
    v.title.toLowerCase().includes('ai daily') ||
    v.title.toLowerCase().includes('daily briefing')
  )

  // 如果没有找到AI早报，使用第一个视频
  const targetVideos = aiVideos.length > 0 ? aiVideos : videos.slice(0, 1)

  console.log(`   找到 ${targetVideos.length} 个目标视频`)
  console.log()

  // 3. 下载字幕并提取新闻
  console.log('[3/4] 下载字幕并提取新闻...')

  let successCount = 0

  for (const video of targetVideos) {
    console.log(`\n   处理: ${video.title}`)
    console.log(`   链接: ${video.url}`)

    // 下载字幕
    console.log('   下载字幕...')
    const subtitle = await youtube.downloadSubtitles(video.url, ['zh-Hans', 'en'])

    if (!subtitle || subtitle.length < 100) {
      console.log('   字幕获取失败或内容过短')
      continue
    }

    console.log(`   字幕长度: ${subtitle.length} 字符`)
    console.log('   调用AI提取新闻...')

    // 调用AI提取新闻
    const result = await extractNews(video.title, video.url, subtitle)
    if (result) {
      const filePath = await saveMarkdown(video.title, result)
      console.log(`   已保存: ${filePath}`)
      successCount++
    }

    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  // 清理临时文件
  await youtube.cleanup()

  console.log()

  // 4. 完成
  console.log('[4/4] 完成!')
  console.log()
  console.log('='.repeat(50))
  console.log(`  成功处理: ${successCount}/${targetVideos.length}`)
  console.log('='.repeat(50))
}

// 运行
main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
