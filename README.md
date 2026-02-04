# juyaAgent - YouTube AI Daily Briefing Extractor

自动获取 @imjuya YouTube 频道的 AI 早报视频，下载字幕并使用 AI 提取新闻，生成结构化 Markdown 文档。

## 功能特性

- 获取 YouTube 频道最新视频
- 自动下载中英文字幕
- 调用 MiniMax 模型提取新闻
- 生成结构化 Markdown（标题 ≤30 字，内容 ≤150 字）

## 环境要求

- Node.js 18+
- TypeScript
- yt-dlp (用于下载字幕)

## 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/yule111222/juyaAgent.git
cd juyaAgent

# 2. 安装依赖
npm install

# 3. 安装 yt-dlp (如果未安装)
brew install yt-dlp   # macOS
# 或
pip install yt-dlp     # Python
```

## 配置

创建 `.env` 文件：

```env
# MiniMax API Key (使用 Claude Agent SDK)
MINIMAX_API_KEY=sk-cp-xxx

# YouTube 频道
YOUTUBE_CHANNEL=https://www.youtube.com/@imjuya

# 输出目录
OUTPUT_DIR=./output
```

## 运行

```bash
npx tsx src/index.ts
```

输出示例：

```
==================================================
  YouTube AI早报提取工具
==================================================
   频道: https://www.youtube.com/@imjuya

[1/4] 获取最新视频列表...
   找到 5 个视频

[2/4] 筛选AI早报视频...
   找到 4 个目标视频

[3/4] 下载字幕并提取新闻...

   处理: OpenAI releases Codex App; SpaceX acquires xAI [AI Daily Briefing 2026-02-03]
      下载字幕...
      字幕长度: 1262 字符
      调用AI提取新闻...
      已保存: /Users/yuyue/code/juyaAgent/OpenAI releases Codex App; SpaceX acquires xAI [AI Daily Briefing 2026-02-03].md

[4/4] 完成!

==================================================
  成功处理: 4/4
==================================================
```

## 目录结构

```
juyaAgent/
├── src/
│   ├── index.ts      # 主入口，AI 新闻提取逻辑
│   ├── youtube.ts    # YouTube 视频和字幕下载
│   └── types.ts      # TypeScript 类型定义
├── .env              # API Key 和配置（本地）
├── .gitignore        # 忽略 .env, node_modules
├── package.json
└── README.md
```

## 项目结构

### src/index.ts
主程序入口，负责：
- 获取频道最新视频
- 调用 AI 提取新闻
- 保存 Markdown 文件

### src/youtube.ts
YouTube 相关功能：
- `getLatestVideos()` - 获取频道视频列表
- `downloadSubtitles()` - 下载字幕文件
- `cleanup()` - 清理临时文件

## 常见问题

### 1. 字幕下载失败
确保已安装 yt-dlp：
```bash
yt-dlp --version
```

### 2. API 调用失败
检查 `.env` 中的 `MINIMAX_API_KEY` 是否正确。

### 3. 只想处理最新 1 个视频
修改 `src/index.ts` 第 142 行：
```typescript
const videos = await youtube.getLatestVideos(YOUTUBE_CHANNEL, 1)
```

## License

MIT
