# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 启动项目

本项目无需构建、无需 npm。将目录通过 HTTP 服务后，用 `?config=` 参数打开：

```bash
npx serve .
# 访问：http://localhost:3000/?config=http://localhost:3000/player.json
```

HLS 流需要 HTTP 服务（不支持 `file://`）。MP4 单文件模式支持 `file://` 直接打开。

## 生成 HLS 切片

需要 FFmpeg 在 PATH 中。使用 `-c copy` 不重编码，速度极快：

```bash
node scripts/vchap-gen-hls.js scripts/ntsr-tutorial.gen-hls.json
```

输出到 `hls/`（已 gitignore）。每个章节生成 `hls/<key>/master.m3u8` 及各码率子目录。

## 架构

**无框架、无构建步骤。** 所有 JS 为 ES5，通过 `index.html` 的 `<script>` 标签加载，模块间通过共享全局变量通信。

### 全局状态流转

```
config.js        → 声明全局变量：VIDEO_BASE、CHAPTERS（初始为空）
app.js           → fetch ?config=<url>，填充 VIDEO_BASE + CHAPTERS，调用 vchapBootstrap()
vchapBootstrap()  → VchapState.init() → VchapPlayer.init() → VchapControls.init() → VchapSidebar.render()
```

### 模块职责

| 文件 | 对象 | 职责 |
|------|------|------|
| `js/state.js` | `VchapState` | 全局唯一状态源：mode、currentIdx、durations、watchedSet、画质状态 |
| `js/player.js` | `VchapPlayer` | Video.js 封装；章节加载、seek、HLS/MP4 画质切换、预热 |
| `js/controls.js` | `VchapControls` | 进度条、播放/暂停、音量、倍速、画质菜单、键盘快捷键 |
| `js/sidebar.js` | `VchapSidebar` | 章节列表渲染、已看 ✓ 标记、当前高亮、完成百分比 |
| `js/utils.js` | — | `vchapFmt(s)`（秒→时间串）、`vchapPad(n)`、`vchapGetVideoDuration(url)` |

### 两种播放模式

- **`full` 模式**：所有章节拼成一条连续时间轴；`VchapPlayer.seekGlobal(t)` 通过 `VchapState.startTimes[]` 将全局时间映射到章节索引 + 本地偏移
- **`chapter` 模式**：每个章节独立播放，侧边栏为主要导航

通过 `app.js` 中的 `vchapSetMode('full'|'chapter')` 切换。

### 视频源优先级

每个章节：`hls` > `qualities[]` > `src`，由 `VchapPlayer._srcForChapter(idx)` 解析。

- **HLS**：Video.js VHS 负责 ABR；手动锁定通过 `VchapPlayer.setQuality(rep)` 禁用其余 representation 实现
- **MP4 qualities**：`VchapPlayer.setMp4Quality(label)` 替换 `vjs.src()` 并恢复播放位置
- **`qualities[]` 数组顺序有意义**：index 0 = 默认低清起播；index 越大画质越高

### 命名规范

所有公共函数和变量以 `vchap` / `Vchap` 开头。IIFE 内部私有方法使用 `_` 前缀（如 `_doLoad`、`_srcForChapter`）。

### 忽略路径

`hls/` 和 `player-remote.json` 已加入 gitignore，不得提交视频切片或远端配置文件。
