/**
 * YouTube 相关类型
 */

export interface VideoInfo {
  id: string
  title: string
  url: string
  uploadDate: string
}

export interface ContentItem {
  type: 'article' | 'answer' | 'video'
  id: string
  title: string
  url: string
  excerpt: string
  content: string
  createdAt: number
  likes: number
  comments: number
}

export interface NewsItem {
  title: string
  summary: string
}
