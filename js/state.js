/**
 * state.js — 全局状态
 * @author vinsea
 * @date   2026-06-12
 *
 * 所有模块通过此对象共享状态，避免全局变量散落。
 */
var VchapState = {
  mode:           'full',   // 'full' | 'chapter'
  currentIdx:     0,        // 当前播放章节索引
  isPlaying:      false,    // 是否正在播放
  isSeeking:      false,    // 是否正在拖拽进度条
  durations:      [],       // 各章节时长（秒）
  startTimes:     [],       // 各章节全局开始时间（秒）
  totalDuration:  0,        // 全部章节总时长
  durLoaded:      false,    // 时长是否已全部加载完毕
  watchedSet:     {},       // 已观看章节集合（用对象模拟 Set，key=idx）
  transitionOn:   false,    // 章节切换过渡效果开关（默认关闭）
  currentRate:    1,        // 当前播放倍速（切章后需恢复）
  lockedRep:            null,   // 手动锁定的 VHS representation 对象，null = ABR 自动
  selectedQualityLabel: null,   // MP4 qualities 模式下当前选中的 label，null = 第一档

  /**
   * 初始化 durations / startTimes 数组（按章节数量）
   */
  init: function() {
    this.durations  = CHAPTERS.map(function() { return 0; });
    this.startTimes = CHAPTERS.map(function() { return 0; });
  },

  /**
   * 标记章节已观看
   * @param {number} idx
   */
  markWatched: function(idx) {
    this.watchedSet[idx] = true;
  },

  /**
   * 判断章节是否已观看
   * @param {number} idx
   * @returns {boolean}
   */
  isWatched: function(idx) {
    return !!this.watchedSet[idx];
  },

  /**
   * 已观看章节数
   * @returns {number}
   */
  watchedCount: function() {
    return Object.keys(this.watchedSet).length;
  }
};
