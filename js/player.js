/**
 * player.js — Video.js 播放器封装
 * @author vinsea
 * @date   2026-06-12
 *
 * 负责：初始化 Video.js、加载章节、全局时间轴 seek、章节切换过渡
 * 分辨率切换由 Video.js VHS 原生处理（HLS master.m3u8 多码率）
 */

var VchapPlayer = (function() {

  var vjs          = null;
  var flashEl      = null;
  var _preloadIdx  = -1;           // 正在预热的章节索引，-1 表示未启动
  var PRELOAD_AHEAD = 20;          // 距章节结束还剩多少秒时开始预热下一章

  /* ── 获取章节的播放地址（优先 hls > qualities > src） ── */
  function _srcForChapter(idx) {
    var ch = CHAPTERS[idx];
    if (ch.hls) return VIDEO_BASE + ch.hls;
    if (ch.qualities && ch.qualities.length) {
      var label = VchapState.selectedQualityLabel;
      var q = label
        ? _findQuality(ch.qualities, label) || ch.qualities[0]
        : ch.qualities[0];
      return VIDEO_BASE + q.src;
    }
    return VIDEO_BASE + (ch.src || '');
  }

  /* ── 获取 MIME type ── */
  function _typeForChapter(idx) {
    var ch = CHAPTERS[idx];
    if (ch.hls) return 'application/x-mpegURL';
    return 'video/mp4';
  }

  /* ── 在 qualities 数组中按 label 查找 ── */
  function _findQuality(qualities, label) {
    for (var i = 0; i < qualities.length; i++) {
      if (qualities[i].label === label) return qualities[i];
    }
    return null;
  }

  /* ── MP4 qualities 模式：切换画质（保留播放位置） ── */
  function setMp4Quality(label) {
    var ch = CHAPTERS[VchapState.currentIdx];
    if (!ch.qualities) return;
    var q = _findQuality(ch.qualities, label);
    if (!q) return;
    VchapState.selectedQualityLabel = label;
    var wasPlaying = VchapState.isPlaying;
    var savedTime  = vjs.currentTime();
    vjs.src({ src: VIDEO_BASE + q.src, type: 'video/mp4' });
    vjs.load();
    vjs.one('loadedmetadata', function() {
      vjs.currentTime(Math.min(savedTime, vjs.duration() - 0.05));
      if (wasPlaying) vjs.play().catch(function() {});
    });
    VchapControls.syncMp4QualityUI(label);
  }

  /* ── 初始化 Video.js ── */
  function init() {
    flashEl = document.getElementById('video-flash');

    vjs = videojs('main-vid', {
      controls:      true,
      autoplay:      false,
      preload:       'auto',
      fluid:         false,
      fill:          true,
      bigPlayButton: true,
      html5: {
        vhs: {
          overrideNative:         true,
          enableLowInitialPlaylist: true   // 优先低码率起播，快速展示第一帧
        }
      }
    });

    vjs.on('ended', function() {
      VchapState.markWatched(VchapState.currentIdx);
      VchapSidebar.refresh();
      var next = VchapState.currentIdx + 1;
      if (next < CHAPTERS.length) {
        loadChapter(next, true);
      } else {
        VchapState.isPlaying = false;
        VchapControls.updatePlayIcon();
      }
    });

    vjs.on('play',  function() {
      VchapState.isPlaying = true;
      VchapControls.updatePlayIcon();
      VchapSidebar.updateActive();
    });
    vjs.on('pause', function() {
      VchapState.isPlaying = false;
      VchapControls.updatePlayIcon();
      VchapSidebar.updateActive();
    });
    vjs.on('timeupdate', function() {
      VchapControls.updateProgress();
      _maybePreloadNext();
    });
    vjs.on('loadedmetadata', function() {
      if (!VchapState.durLoaded) {
        VchapState.durations[VchapState.currentIdx] = vjs.duration();
      }
      /* HLS 加载后同步画质菜单（representations 此时已就绪） */
      VchapControls.buildQualityMenu();
    });

    vjs.on('waiting', function() { VchapControls.setLoading(true);  });
    vjs.on('playing', function() { VchapControls.setLoading(false); });
    vjs.on('canplay', function() { VchapControls.setLoading(false); });

    /* VHS ABR 切换码率时更新徽章 */
    vjs.on('mediachange', function() {
      VchapControls.updateQualityBadge();
    });

    vjs.on('volumechange', function() { VchapControls.syncVolumeUI(); });
    vjs.on('ratechange',   function() { VchapControls.syncRateUI();   });

    vjs.on('error', function() {
      var err = vjs.error();
      var msg = '视频加载失败';
      if (err) {
        if      (err.code === 4) msg = '找不到视频文件，请检查路径配置';
        else if (err.code === 2) msg = '网络错误，无法加载视频';
        else if (err.code === 3) msg = '视频文件损坏或格式不支持';
        else                     msg = '播放错误（code ' + err.code + '）';
      }
      VchapControls.showError(msg);
    });

    document.getElementById('click-overlay').addEventListener('click', function() {
      togglePlay();
    });
  }

  /* ── 预热下一章（fetch 填充浏览器 HTTP 缓存，不创建任何 video 元素） ── */
  function _preloadNextChapter(idx) {
    if (idx >= CHAPTERS.length) return;
    var masterUrl = _srcForChapter(idx);
    if (masterUrl.indexOf('.m3u8') === -1) return;   // 非 HLS 不处理

    /* 先 fetch master.m3u8，再 fetch 第一个 variant 的 index.m3u8，再 fetch 前 3 个 ts 切片 */
    fetch(masterUrl, { priority: 'low' })
      .then(function(r) { return r.text(); })
      .then(function(text) {
        /* 找第一个 variant URL（#EXT-X-STREAM-INF 下面那行） */
        var lines = text.split('\n');
        var variantUrl = null;
        for (var i = 0; i < lines.length; i++) {
          var l = lines[i].trim();
          if (l && l[0] !== '#') {
            variantUrl = l.indexOf('://') !== -1
              ? l
              : masterUrl.replace(/\/[^\/]*$/, '/') + l;
            break;
          }
        }
        if (!variantUrl) return;
        return fetch(variantUrl, { priority: 'low' })
          .then(function(r) { return r.text(); })
          .then(function(playlist) {
            /* 取前 3 个 .ts 切片 URL 并 fetch（触发缓存，丢弃 body） */
            var segs = [];
            var base = variantUrl.replace(/\/[^\/]*$/, '/');
            var plines = playlist.split('\n');
            for (var j = 0; j < plines.length && segs.length < 3; j++) {
              var pl = plines[j].trim();
              if (pl && pl[0] !== '#') {
                segs.push(pl.indexOf('://') !== -1 ? pl : base + pl);
              }
            }
            segs.forEach(function(segUrl) {
              fetch(segUrl, { priority: 'low' }).catch(function() {});
            });
          });
      })
      .catch(function() {});
  }

  /* ── timeupdate 时检查是否需要预热下一章 ── */
  function _maybePreloadNext() {
    var next = VchapState.currentIdx + 1;
    if (next >= CHAPTERS.length) return;         // 最后一章
    if (_preloadIdx === next) return;             // 已预热过
    var remaining = vjs.remainingTime ? vjs.remainingTime() : 0;
    var dur = vjs.duration();
    if (!dur || dur <= 0) return;
    if (remaining > 0 && remaining <= PRELOAD_AHEAD) {
      _preloadIdx = next;
      _preloadNextChapter(next);
    }
  }

  /* ── 加载章节（含可选淡黑过渡） ── */
  function loadChapter(idx, autoplay) {
    autoplay = !!autoplay;
    var different = (idx !== VchapState.currentIdx);

    if (different && VchapState.transitionOn) {
      flashEl.style.cssText = 'opacity:0.7;transition:opacity 0.12s ease';
      setTimeout(function() {
        _doLoad(idx, autoplay);
        flashEl.style.cssText = 'opacity:0;transition:opacity 0.35s ease 0.05s';
      }, 130);
    } else {
      _doLoad(idx, autoplay);
    }
  }

  /* ── 实际加载逻辑 ── */
  function _doLoad(idx, autoplay) {
    _preloadIdx = -1;   // 新章节开始，重置预热状态
    VchapState.currentIdx = idx;
    vjs.src({ src: _srcForChapter(idx), type: _typeForChapter(idx) });
    vjs.load();
    vjs.one('loadedmetadata', function() {
      if (VchapState.currentRate !== 1) vjs.playbackRate(VchapState.currentRate);
    });
    if (autoplay) vjs.play().catch(function() {});
    document.getElementById('chap-label').textContent = CHAPTERS[idx].title;
    VchapSidebar.updateActive();
  }

  /* ── 全局时间轴 seek（完整视频模式） ── */
  function seekGlobal(t) {
    t = Math.max(0, Math.min(t, VchapState.totalDuration));
    var idx = 0;
    for (var i = CHAPTERS.length - 1; i >= 0; i--) {
      if (VchapState.startTimes[i] <= t) { idx = i; break; }
    }
    var local      = t - VchapState.startTimes[idx];
    var wasPlaying = VchapState.isPlaying;

    if (idx !== VchapState.currentIdx) {
      loadChapter(idx, false);
      vjs.one('loadedmetadata', function() {
        vjs.currentTime(Math.min(local, vjs.duration() - 0.05));
        if (wasPlaying) vjs.play().catch(function() {});
      });
      document.getElementById('chap-label').textContent = CHAPTERS[idx].title;
    } else {
      vjs.currentTime(Math.min(local, vjs.duration() ? vjs.duration() - 0.05 : local));
      if (wasPlaying) vjs.play().catch(function() {});
    }
  }

  /* ── 手动锁定分辨率（传 null = 恢复 ABR 自动） ── */
  function setQuality(rep) {
    var tech = vjs.tech({ IWillNotUseThisInPlugins: true });
    if (!tech || !tech.vhs) return;
    var reps = tech.vhs.representations();
    if (!reps || !reps.length) return;

    if (rep === null) {
      /* 全部 enable → VHS 恢复 ABR */
      reps.forEach(function(r) { r.enabled(true); });
    } else {
      /* 只 enable 目标，其余 disable */
      reps.forEach(function(r) { r.enabled(r === rep); });
    }
    VchapControls.syncQualityUI(rep);
  }

  /* ── 获取 VHS representations（供 Controls 构建菜单用） ── */
  function getRepresentations() {
    var tech = vjs.tech({ IWillNotUseThisInPlugins: true });
    if (!tech || !tech.vhs) return [];
    return tech.vhs.representations() || [];
  }

  /* ── 播放/暂停切换 ── */
  function togglePlay() {
    if (vjs.paused()) {
      vjs.play().catch(function() {});
    } else {
      vjs.pause();
    }
  }

  function currentTime()     { return vjs ? vjs.currentTime()     : 0; }
  function duration()        { return vjs ? vjs.duration()        : 0; }
  function buffered()        { return vjs ? vjs.buffered()        : null; }
  function bufferedPercent() { return vjs ? vjs.bufferedPercent() : 0; }
  function remainingTime()   { return vjs ? vjs.remainingTime()   : 0; }

  function setRate(r) {
    VchapState.currentRate = r;
    if (vjs) vjs.playbackRate(r);
  }

  function setVolume(v) { if (vjs) vjs.volume(v); }
  function getVolume()  { return vjs ? vjs.volume() : 1; }
  function setMuted(b)  { if (vjs) vjs.muted(b); }
  function getMuted()   { return vjs ? vjs.muted() : false; }

  function requestFullscreen() { if (vjs) vjs.requestFullscreen(); }
  function exitFullscreen()    { if (vjs) vjs.exitFullscreen(); }
  function isFullscreen()      { return vjs ? vjs.isFullscreen() : false; }

  function seekLocal(t) { if (vjs) vjs.currentTime(Math.max(0, t)); }

  return {
    init:               init,
    loadChapter:        loadChapter,
    seekGlobal:         seekGlobal,
    seekLocal:          seekLocal,
    setQuality:         setQuality,
    setMp4Quality:      setMp4Quality,
    getRepresentations: getRepresentations,
    togglePlay:         togglePlay,
    currentTime:        currentTime,
    duration:           duration,
    buffered:           buffered,
    bufferedPercent:    bufferedPercent,
    remainingTime:      remainingTime,
    setRate:            setRate,
    setVolume:          setVolume,
    getVolume:          getVolume,
    setMuted:           setMuted,
    getMuted:           getMuted,
    requestFullscreen:  requestFullscreen,
    exitFullscreen:     exitFullscreen,
    isFullscreen:       isFullscreen
  };

})();
