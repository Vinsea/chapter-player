# vchaplayer — 视频教程播放器

> 基于 [Video.js](https://videojs.com/) 构建，零依赖、纯浏览器运行的多章节视频教程播放器。
>
> **作者：vinsea**
> 
> chap：chapter 的缩写，和 player 结合到一起

---

## 为什么不用现有框架？

GitHub 上已有不少视频课程播放器方案，但都与本项目的使用场景存在结构性冲突：

| 方案                            | 问题                                                                     |
| ------------------------------- | ------------------------------------------------------------------------ |
| **Plyr**                        | 纯单视频播放器，无章节管理、无全局时间轴，需大量二次开发                 |
| **Video.js Playlist Plugin**    | 章节是独立视频序列，没有「多章节拼成一条时间轴」的连续进度概念           |
| **Coursera / Udemy 开源播放器** | 深度绑定其后端 API 与用户体系，无法脱离平台独立部署                      |
| **ArtPlayer**                   | 功能丰富但体积大、依赖 npm 构建流程，与「本地 file:// 直接打开」目标冲突 |
| **HLS.js 裸用**                 | 只处理流协议，UI 控制栏、章节逻辑、进度持久化全部自行实现，工作量更大    |

**本项目的核心诉求**：离线 / 局域网可用、无构建工具、JSON 配置即开即用、多章节连续时间轴 + B 站风格章节线、同时支持本地 MP4 与 HLS 流。没有任何现有方案能开箱即用地满足这个组合，因此选择以 Video.js 为播放内核自行封装。

---

## 功能一览

| 功能             | 说明                                                                    |
| ---------------- | ----------------------------------------------------------------------- |
| **完整视频模式** | 多个视频拼接为单一连续时间轴，进度条上叠加 B 站风格章节分割线与悬停气泡 |
| **章节模式**     | 侧边栏目录导航，已看章节显示 ✓，点击任意章节直达                        |
| **分辨率切换**   | MP4 多码率 / HLS 均支持画质菜单，切换时保留播放位置                     |
| **倍速菜单**     | 0.5× ~ 2×，悬停弹出，切章后自动恢复                                     |
| **章节过渡**     | 可开关的淡黑切换效果（默认关闭）                                        |
| **键盘快捷键**   | `Space/K` 播放暂停、`←→` 快退/进 5s、`↑↓` 调音量、`F` 全屏、`M` 静音    |
| **观看进度**     | 侧边栏实时显示课程完成百分比，✓ 标注已看章节                            |

---

## 视频格式支持

播放器根据章节配置的字段自动选择播放模式，**同一课程可混用**：

| 配置字段    | 格式           | 画质切换方式                     |
| ----------- | -------------- | -------------------------------- |
| `hls`       | HLS（`.m3u8`） | Video.js VHS 原生 ABR + 手动锁定 |
| `qualities` | MP4 多码率     | 切换 src，保留播放位置           |
| `src`       | 单 MP4         | 无画质菜单                       |

优先级：`hls` > `qualities` > `src`

---

## 快速开始

### 第零步：创建本地配置文件

`player.json` 已加入 `.gitignore`，不会被提交。首次使用时，将 `demo.json` 复制一份作为起点：

```bash
cp demo.json player.json
```

然后编辑 `player.json` 填入你自己的课程标题、视频路径和章节信息。

### 第一步：准备 JSON 配置文件

#### MP4 单分辨率（最简）

```json
{
  "title": "我的课程",
  "videoBase": "file:///C:/Users/yourname/Videos/",
  "chapters": [
    { "src": "ch01.mp4", "title": "第一章：介绍" },
    { "src": "ch02.mp4", "title": "第二章：进阶" }
  ]
}
```

#### MP4 多分辨率（`qualities` 数组）

```json
{
  "title": "我的课程",
  "videoBase": "https://cdn.example.com/videos/",
  "chapters": [
    {
      "title": "第一章：介绍",
      "qualities": [
        { "label": "1080P", "src": "ch01_1080p.mp4" },
        { "label": "720P",  "src": "ch01_720p.mp4"  },
        { "label": "480P",  "src": "ch01_480p.mp4"  }
      ]
    }
  ]
}
```

> 所有章节的 `label` 集合需保持一致；切换画质时播放位置不变。

#### HLS 多码率（`hls` 字段）

```json
{
  "title": "我的课程",
  "videoBase": "https://cdn.example.com/hls/",
  "chapters": [
    { "title": "第一章：介绍", "hls": "ch01/master.m3u8" },
    { "title": "第二章：进阶", "hls": "ch02/master.m3u8" }
  ]
}
```

> HLS 需要 HTTP 服务器（不支持 `file://`）。`master.m3u8` 包含多码率 variant，播放器自动 ABR 并提供手动锁定菜单。

#### 混合模式（同一课程 MP4 + HLS 混用）

```json
{
  "title": "混合示例",
  "videoBase": "https://cdn.example.com/",
  "chapters": [
    { "title": "第一章（HLS）",    "hls": "hls/ch01/master.m3u8" },
    { "title": "第二章（MP4 多码）", "qualities": [
        { "label": "1080P", "src": "mp4/ch02_1080p.mp4" },
        { "label": "720P",  "src": "mp4/ch02_720p.mp4"  }
      ]
    },
    { "title": "第三章（单 MP4）", "src": "mp4/ch03.mp4" }
  ]
}
```

---

### 第二步：启动本地服务器

```bash
# Node.js（推荐）
npx serve .

# Python
python -m http.server 8080
```

### 第三步：访问播放器

```
http://localhost:3000/?config=http://localhost:3000/demo.json
```

将 `config=` 后的值替换为你的 JSON 文件的实际地址（支持相对路径、绝对路径、跨域 URL）。

---

## 生成 HLS 切片（scripts/）

提供 `scripts/vchap-gen-hls.js`，用 FFmpeg 将 MP4 批量切成 HLS 多码率分片（`-c copy` 不重编码，极快）。

```bash
node scripts/vchap-gen-hls.js scripts/your-course.gen-hls.json
```

`gen-hls.json` 格式：

```json
{
  "outBase": "/path/to/output/hls",
  "segSeconds": 6,
  "chapters": [
    {
      "key": "ch01",
      "variants": [
        { "label": "720P",  "bandwidth": 450000,  "resolution": "1280x720",  "src": "/path/ch01_720p.mp4" },
        { "label": "1080P", "bandwidth": 9000000, "resolution": "1920x1080", "src": "/path/ch01.mp4" }
      ]
    }
  ]
}
```

输出目录结构：

```
hls/
└── ch01/
    ├── master.m3u8
    ├── 720P/
    │   ├── index.m3u8
    │   ├── seg000.ts
    │   └── ...
    └── 1080P/
        ├── index.m3u8
        └── ...
```

将 `outBase` 内容放到 HTTP 可访问路径，在 JSON 配置中用 `"hls": "ch01/master.m3u8"` 引用即可。

---

## 文件结构

```
story-deck-2/
├── index.html          # 主页面入口
├── demo.json           # 示例配置（MP4 多分辨率演示）
├── player.json         # 另一份示例配置
├── css/
│   ├── base.css        # 全局 CSS 变量、导航栏、布局
│   ├── player.css      # 播放器区域、进度条、控制栏、分辨率菜单
│   └── sidebar.css     # 章节侧边栏
├── js/
│   ├── config.js       # 运行时全局变量（由 app.js 填充）
│   ├── utils.js        # vchapFmt / vchapPad / vchapGetVideoDuration
│   ├── state.js        # VchapState — 全局状态对象
│   ├── player.js       # VchapPlayer — Video.js 封装、HLS/MP4 画质切换
│   ├── controls.js     # VchapControls — 控制栏、进度条、键盘、画质菜单
│   ├── sidebar.js      # VchapSidebar — 章节列表与高亮
│   └── app.js          # 主入口：vchapBootstrap / vchapSetMode
├── scripts/
│   ├── vchap-gen-hls.js              # HLS 批量切片脚本（需 FFmpeg）
│   └── *.gen-hls.json               # 各项目的 HLS 生成配置
├── vendor/
│   ├── video.min.js    # Video.js 8.x（本地，无需 CDN）
│   └── video-js.css
└── docs/               # 开发者文档（架构、API、配置 Schema 等）
```

---

## 键盘快捷键

| 按键          | 功能        |
| ------------- | ----------- |
| `Space` / `K` | 播放 / 暂停 |
| `→`           | 快进 5 秒   |
| `←`           | 快退 5 秒   |
| `↑`           | 音量 +10%   |
| `↓`           | 音量 -10%   |
| `F`           | 全屏切换    |
| `M`           | 静音切换    |

---

## 浏览器兼容

Chrome 90+、Edge 90+、Firefox 88+。Safari 对本地 `file://` 视频有限制，建议使用本地 HTTP 服务器。HLS 播放需 HTTP 服务器（不支持 `file://`）。

---

## 技术栈

- **Video.js 8.x** — 播放器内核（本地引入，无需 CDN）；HLS 由内置 VHS 插件处理
- 原生 HTML / CSS / ES5 JavaScript，**无构建工具**，**无 npm 依赖**
- 命名规范：所有公共函数、变量以 `vchap` / `Vchap` 开头

---

## 许可证

MIT License — 可自由使用、修改、分发，包括商业用途。

修改或二次开发时，请在显著位置保留以下来源声明：

> Based on [vchaplayer](https://github.com/Vinsea/vchaplayer) by Vinsea.
