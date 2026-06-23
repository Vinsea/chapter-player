/**
 * config.js — 运行时由 app.js 从远程 JSON 填充
 * @author vinsea
 * @date   2026-06-12
 *
 * JSON 格式示例：
 * {
 *   "title": "课程名称",
 *   "videoBase": "https://example.com/videos/",
 *   "chapters": [
 *     {
 *       "title": "第一章：概览",
 *       "desc": "...",
 *       "src": "01.mp4",            // 单分辨率时使用（兼容旧格式）
 *       "qualities": [              // 多分辨率时使用（优先于 src）
 *                                  // ⚠️ 数组顺序：从低到高排列
 *                                  //    第一项 = 默认加载的低清版
 *                                  //    最后一项 = 自动升级的目标高清版
 *         { "label": "720P",  "src": "01_720p.mp4"  },
 *         { "label": "1080P", "src": "01_1080p.mp4" }
 *       ]
 *     }
 *   ]
 * }
 */
var VIDEO_BASE = '';
var CHAPTERS   = [];
