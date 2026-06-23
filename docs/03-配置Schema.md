# JSON 配置 Schema

> 开发者文档 · story-deck-2
> 作者：vinsea · 2026-06-12

---

## 顶层字段

```
{
  "title":     string,        // 课程名，显示在导航栏 logo 与页面 title
  "videoBase": string,        // 视频根目录，末尾带 "/"；与每个章节 src 拼接
  "chapters":  Chapter[]      // 章节列表，按播放顺序排列
}
```

## Chapter 对象

```
{
  "title":     string,        // 必填：章节名，显示在侧边栏与控制栏标签
  "desc":      string,        // 可选：章节描述（当前版本不展示于 UI）

  // 二选一：
  "src":       string,        // 单分辨率：视频文件名（相对于 videoBase）
  "qualities": Quality[]      // 多分辨率：优先于 src；存在时忽略 src
}
```

## Quality 对象

```
{
  "label": string,   // 分辨率标签，显示在画质菜单，如 "1080P" / "720P" / "480P"
  "src":   string    // 视频文件名（相对于 videoBase）
}
```

---

## 规则与约束

1. **`qualities` 优先于 `src`**：同一章节若同时填写 `src` 和 `qualities`，`src` 被忽略。
2. **Label 集合需一致**：所有章节建议使用相同的 label 集合。切换分辨率时以 `VchapState.currentQuality` 匹配每章的 label，找不到时回退到该章第一条。
3. **混用兼容**：允许部分章节只有 `src`（单文件），其余章节有 `qualities`。画质按钮只在至少一个章节有 `qualities` 且选项 > 1 时显示。
4. **`videoBase` 拼接**：`videoBase + quality.src` 或 `videoBase + chapter.src` 组成完整 URL，可以是：
   - 相对路径：`"videoBase": ""` 或 `"videoBase": "videos/"`
   - 本地文件：`"videoBase": "file:///C:/Users/yourname/Videos/"`
   - 远程 URL：`"videoBase": "https://cdn.example.com/videos/"`

---

## 完整示例

```json
{
  "title": "Vue3 实战课",
  "videoBase": "https://cdn.example.com/vue3/",
  "chapters": [
    {
      "title": "第一章：项目概览",
      "desc": "搭建开发环境与基础配置",
      "qualities": [
        { "label": "1080P", "src": "ch01_1080p.mp4" },
        { "label": "720P",  "src": "ch01_720p.mp4"  },
        { "label": "480P",  "src": "ch01_480p.mp4"  }
      ]
    },
    {
      "title": "第二章：核心概念",
      "desc": "Composition API 深入",
      "qualities": [
        { "label": "1080P", "src": "ch02_1080p.mp4" },
        { "label": "720P",  "src": "ch02_720p.mp4"  },
        { "label": "480P",  "src": "ch02_480p.mp4"  }
      ]
    },
    {
      "title": "第三章：番外（低清晰度只有一档）",
      "src": "bonus.mp4"
    }
  ]
}
```
