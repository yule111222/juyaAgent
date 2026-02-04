/**
 * YouTube 字幕下载模块
 * 使用 yt-dlp 下载字幕
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { VideoInfo, NewsItem } from './types'

const execAsync = promisify(exec)

const YTDLP_BIN = process.env.YTDLP_BIN || 'yt-dlp'
const OUTPUT_DIR = process.env.OUTPUT_DIR || process.cwd()

// 获取完整环境变量
const ENV = { ...process.env }

/**
 * 获取频道最新视频列表
 */
export async function getLatestVideos(channelUrl: string, limit: number = 3): Promise<VideoInfo[]> {
  try {
    const { stdout } = await execAsync(
      `${YTDLP_BIN} "${channelUrl}" --flat-playlist -J --playlist-end ${limit}`,
      { timeout: 120000, env: ENV }
    )

    const data = JSON.parse(stdout)
    const entries = data.entries || []

    return entries.map((entry: any) => ({
      id: entry.id,
      title: entry.title,
      url: `https://youtu.be/${entry.id}`,
      uploadDate: entry.upload_date || new Date().toISOString()
    }))
  } catch (error) {
    console.error('获取视频列表失败:', error instanceof Error ? error.message : error)
    return []
  }
}

/**
 * 下载视频字幕（只下载字幕，不下载视频）
 */
export async function downloadSubtitles(videoUrl: string, languages: string[] = ['zh-Hans', 'en']): Promise<string> {
  const tempDir = join(OUTPUT_DIR, 'temp')
  await fs.mkdir(tempDir, { recursive: true })

  const langStr = languages.join(',')
  const outputPattern = join(tempDir, '%(title)s.%(ext)s')

  try {
    await execAsync(
      `${YTDLP_BIN} "${videoUrl}" ` +
      `--write-subs ` +
      `--sub-langs "${langStr}" ` +
      `--skip-download ` +
      `--sub-format "vtt" ` +
      `-o "${outputPattern}"`,
      { timeout: 180000, env: ENV }
    )

    // 查找下载的字幕文件
    const files = await fs.readdir(tempDir)
    const subtitleFile = files.find(f => f.endsWith('.vtt'))

    if (subtitleFile) {
      const content = await fs.readFile(join(tempDir, subtitleFile), 'utf-8')
      return parseVTT(content)
    }

    return ''
  } catch (error) {
    console.error('下载字幕失败:', error instanceof Error ? error.message : error)
    return ''
  }
}

/**
 * 解析VTT字幕文件
 */
function parseVTT(vttContent: string): string {
  const lines = vttContent.split('\n')
  const result: string[] = []

  // 跳过WEBVTT头部和空行
  let skipHeader = true

  for (const line of lines) {
    const trimmed = line.trim()

    // 跳过头部
    if (skipHeader) {
      if (trimmed === 'WEBVTT' || trimmed === '') {
        continue
      }
      skipHeader = false
    }

    // 跳过时间戳行（如 00:00:00.500 --> 00:00:05.051）
    if (trimmed.includes('-->')) {
      continue
    }

    // 跳过章节标记
    if (trimmed.startsWith('NOTE') || trimmed.startsWith('CHAPTER')) {
      continue
    }

    // 收集有效文本
    if (trimmed && !/^\d+$/.test(trimmed)) {
      result.push(trimmed)
    }
  }

  return result.join('\n')
}

/**
 * 清理临时文件
 */
export async function cleanup(): Promise<void> {
  const tempDir = join(OUTPUT_DIR, 'temp')
  try {
    const files = await fs.readdir(tempDir)
    for (const file of files) {
      await fs.unlink(join(tempDir, file))
    }
  } catch {
    // 目录不存在，忽略
  }
}

/**
 * 获取视频信息（不下载）
 */
export async function getVideoInfo(videoUrl: string): Promise<VideoInfo | null> {
  try {
    const { stdout } = await execAsync(
      `${YTDLP_BIN} "${videoUrl}" --dump-json`,
      { timeout: 60000, env: ENV }
    )

    const data = JSON.parse(stdout)
    return {
      id: data.id,
      title: data.title,
      url: `https://youtu.be/${data.id}`,
      uploadDate: data.upload_date || new Date().toISOString()
    }
  } catch (error) {
    console.error('获取视频信息失败:', error instanceof Error ? error.message : error)
    return null
  }
}
