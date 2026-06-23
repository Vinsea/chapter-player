# 模块 API 参考

> 开发者文档 · story-deck-2
> 作者：vinsea · 2026-06-12

---

## utils.js — 工具函数

### `vchapFmt(s: number): string`
将秒数格式化为 `m:ss` 或 `h:mm:ss`。

```
vchapFmt(0)     → '0:00'
vchapFmt(75)    → '1:15'
vchapFmt(3665)  → '1:01:05'
```

### `vchapPad(n: number): string`
将数字补零到两位字符串。

### `vchapGetVideoDuration(src: string): Promise<number>`
预加载视频元数据，返回时长（秒）。用于 `vchapLoadAllDurations()`。

---

## state.js — VchapState

全局单例，存储所有运行时状态。

| 属性 | 类型 | 说明 |
|------|------|------|
| `mode` | `'full' \| 'chapter'` | 当前播放模式 |
| `currentIdx` | `number` | 正在播放的章节索引 |
| `isPlaying` | `boolean` | 播放状态 |
| `isSeeking` | `boolean` | 进度条拖拽中 |
| `durations[]` | `number[]` | 各章节时长（秒） |
| `startTimes[]` | `number[]` | 各章节全局开始时间（秒） |
| `totalDuration` | `number` | 所有章节时长之和 |
| `durLoaded` | `boolean` | 时长是否已全部预加载 |
| `watchedSet` | `object` | 已观看章节索引集合 |
| `transitionOn` | `boolean` | 章节切换淡黑过渡开关 |
| `currentRate` | `number` | 当前倍速（切章后恢复用） |
| `currentQuality` | `string` | 当前分辨率 label（如 `'1080P'`） |

### 方法

```
VchapState.init()              → 按 CHAPTERS 长度初始化 durations / startTimes
VchapState.markWatched(idx)    → 标记章节 idx 已观看
VchapState.isWatched(idx)      → 是否已观看
VchapState.watchedCount()      → 已观看章节数
```

---

## player.js — VchapPlayer

Video.js 的语义化封装。内部持有 `vjs` 实例，对外暴露如下接口。

### 加载 & 跳转

```
VchapPlayer.init()                     → 创建 Video.js 实例，绑定内部事件
VchapPlayer.loadChapter(idx, autoplay) → 加载章节（支持淡黑过渡）
VchapPlayer.seekGlobal(t)              → 完整模式：按全局时间跳转（自动计算章节+偏移）
VchapPlayer.seekLocal(t)               → 章节模式：直接 currentTime(t)
VchapPlayer.setQuality(label)          → 切换分辨率，保留播放位置和播放状态
```

### 播放控制

```
VchapPlayer.togglePlay()    → 播放 / 暂停
VchapPlayer.currentTime()   → 当前章节已播时间（秒）
VchapPlayer.duration()      → 当前章节总时长（秒）
VchapPlayer.remainingTime() → 当前章节剩余时间（秒）
VchapPlayer.buffered()      → TimeRanges 原始对象
VchapPlayer.bufferedPercent() → 缓冲百分比 0~1
```

### 音量 & 倍速

```
VchapPlayer.setRate(r)    → 设置倍速，同步 VchapState.currentRate
VchapPlayer.setVolume(v)  → 设置音量 0~1
VchapPlayer.getVolume()   → 获取音量
VchapPlayer.setMuted(b)   → 设置静音
VchapPlayer.getMuted()    → 是否静音
```

### 全屏

```
VchapPlayer.requestFullscreen()
VchapPlayer.exitFullscreen()
VchapPlayer.isFullscreen() → boolean
```

---

## controls.js — VchapControls

所有 UI 交互的绑定与同步。`init()` 后内部事件自治，外部只调用同步方法。

```
VchapControls.init()           → 绑定所有控件事件
VchapControls.updateProgress() → 刷新进度条、时间显示、总进度（由 timeupdate 驱动）
VchapControls.renderMarkers()  → 渲染 B 站风格章节分割标记（时长加载后调用一次）
VchapControls.updatePlayIcon() → 同步播放/暂停图标
VchapControls.updateVolIcon()  → 同步音量图标
VchapControls.syncVolumeUI()   → 同步音量滑块 + 图标
VchapControls.syncRateUI()     → 同步倍速按钮文字与高亮
VchapControls.syncQualityUI()  → 同步分辨率按钮文字与选项高亮
VchapControls.setLoading(on)   → 显示/隐藏缓冲动画
VchapControls.showError(msg)   → 显示错误遮罩
```

---

## sidebar.js — VchapSidebar

```
VchapSidebar.render()       → 完整重建章节列表 DOM（配置加载后调用一次）
VchapSidebar.refresh()      → 仅刷新高亮与时长文字（不重建 DOM）
VchapSidebar.updateActive() → 更新当前章节高亮、剩余时间、平滑滚动
```

---

## app.js — 全局函数

```
vchapBootstrap()         → 完整初始化流程（配置加载后调用）
vchapSetMode(m)          → 切换 'full' | 'chapter' 模式
vchapLoadAllDurations()  → 串行预加载所有章节时长
vchapHideLoading()       → 淡出并移除启动遮罩
```
