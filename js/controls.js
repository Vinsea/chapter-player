/**
 * controls.js — 自定义控制栏
 * @author vinsea
 * @date   2026-06-12
 *
 * 负责：进度条交互、章节标记渲染、按钮事件、倍速菜单、分辨率菜单、音量、全屏、键盘
 */

var VchapControls = (function() {

  var progWrap     = null;
  var progTrack    = null;
  var progPlayed   = null;
  var progBuf      = null;
  var progThumb    = null;
  var hoverTip     = null;
  var timeDisp     = null;
  var playIcon     = null;
  var volIcon      = null;
  var errorOverlay = null;
  var loadingEl    = null;
  var qualityBadge = null;

  /* ── 初始化 ── */
  function init() {
    progWrap     = document.getElementById('prog-wrap');
    progTrack    = document.getElementById('prog-track');
    progPlayed   = document.getElementById('prog-played');
    progBuf      = document.getElementById('prog-buf');
    progThumb    = document.getElementById('prog-thumb');
    hoverTip     = document.getElementById('hover-tip');
    timeDisp     = document.getElementById('time-disp');
    playIcon     = document.getElementById('play-icon');
    volIcon      = document.getElementById('vol-icon');
    errorOverlay = document.getElementById('error-overlay');
    loadingEl    = document.getElementById('loading-spinner');
    qualityBadge = document.getElementById('vchap-quality-badge');

    _bindProgress();
    _bindButtons();
    _bindSpeed();
    _bindQuality();
    _bindVolume();
    _bindFullscreen();
    _bindKeyboard();
    _bindTransitionToggle();
  }

  /* ── 进度条交互 ── */
  function _bindProgress() {
    progWrap.addEventListener('mousemove', function(e) {
      var pct   = _pctAt(e);
      var total = _totalSecs();
      var secs  = pct * total;

      var tipPct = Math.max(0, Math.min(100, pct * 100));
      hoverTip.style.left = tipPct + '%';

      var timeEl = hoverTip.querySelector('.htip-time');
      if (timeEl) timeEl.textContent = vchapFmt(secs);

      var chapEl = hoverTip.querySelector('.htip-chap');
      if (chapEl) {
        if (VchapState.mode === 'full' && VchapState.durLoaded && CHAPTERS.length) {
          var idx = 0;
          for (var i = 1; i < VchapState.startTimes.length; i++) {
            if (secs >= VchapState.startTimes[i]) idx = i;
          }
          chapEl.textContent = CHAPTERS[idx].title;
          chapEl.style.display = '';
        } else {
          chapEl.style.display = 'none';
        }
      }
    });

    progWrap.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      VchapState.isSeeking = true;
      progWrap.classList.add('drag');
      _doSeek(_pctAt(e));
      e.preventDefault();
    });

    window.addEventListener('mousemove', function(e) {
      if (VchapState.isSeeking) _doSeek(_pctAt(e));
    });

    window.addEventListener('mouseup', function(e) {
      if (!VchapState.isSeeking) return;
      VchapState.isSeeking = false;
      progWrap.classList.remove('drag');
      _doSeek(_pctAt(e));
    });
  }

  function _pctAt(e) {
    var r = progWrap.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  }

  function _totalSecs() {
    if (VchapState.mode === 'full' && VchapState.durLoaded) return VchapState.totalDuration;
    return VchapPlayer.duration() || 0;
  }

  function _doSeek(pct) {
    var t = pct * _totalSecs();
    if (VchapState.mode === 'full' && VchapState.durLoaded) {
      VchapPlayer.seekGlobal(t);
    } else {
      VchapPlayer.seekLocal(t);
    }
  }

  /* ── 更新进度条显示 ── */
  function updateProgress() {
    var cur    = VchapPlayer.currentTime();
    var dur    = VchapPlayer.duration();
    var bufPct = VchapPlayer.bufferedPercent();

    if (VchapState.mode === 'full' && VchapState.durLoaded && VchapState.totalDuration) {
      var g   = VchapState.startTimes[VchapState.currentIdx] + cur;
      var pct = (g / VchapState.totalDuration) * 100;
      progPlayed.style.width = pct + '%';
      progThumb.style.left   = pct + '%';

      var chDur     = dur || 0;
      var bufSecs   = bufPct * chDur;
      var globalBuf = (VchapState.startTimes[VchapState.currentIdx] + bufSecs) / VchapState.totalDuration * 100;
      progBuf.style.width = globalBuf + '%';

      timeDisp.textContent = vchapFmt(g) + ' / ' + vchapFmt(VchapState.totalDuration);
    } else {
      var p = dur ? (cur / dur) * 100 : 0;
      progPlayed.style.width = p + '%';
      progThumb.style.left   = p + '%';
      progBuf.style.width    = (bufPct * 100) + '%';
      timeDisp.textContent   = vchapFmt(cur) + ' / ' + vchapFmt(dur);
    }

    var pctW = CHAPTERS.length
      ? Math.round((VchapState.watchedCount() / CHAPTERS.length) * 100)
      : 0;
    document.getElementById('total-fill').style.width = pctW + '%';
    document.getElementById('prog-pct').textContent   = pctW + '%';
  }

  /* ── 章节标记渲染（B站风格） ── */
  function renderMarkers() {
    var old = progTrack.querySelectorAll('.vchap-chap-marker');
    for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);

    if (!VchapState.durLoaded || !VchapState.totalDuration) return;

    for (var j = 1; j < CHAPTERS.length; j++) {
      (function(idx) {
        var pct = (VchapState.startTimes[idx] / VchapState.totalDuration) * 100;
        var el  = document.createElement('div');
        el.className = 'vchap-chap-marker chap-marker';
        el.style.left = pct + '%';
        el.innerHTML =
          '<div class="chap-marker-line"></div>' +
          '<div class="chap-marker-tip">' +
          '  <span class="chap-marker-tip-num">第 ' + (idx + 1) + ' 章 · ' + vchapFmt(VchapState.startTimes[idx]) + '</span>' +
          CHAPTERS[idx].title +
          '</div>';
        el.addEventListener('click', function(e) {
          e.stopPropagation();
          VchapPlayer.seekGlobal(VchapState.startTimes[idx]);
        });
        progTrack.appendChild(el);
      })(j);
    }
  }

  /* ── 播放图标更新 ── */
  function updatePlayIcon() {
    var PAUSE = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
    var PLAY  = '<path d="M8 5v14l11-7z"/>';
    if (playIcon) playIcon.innerHTML = VchapState.isPlaying ? PAUSE : PLAY;
  }

  /* ── 音量图标更新 ── */
  function updateVolIcon() {
    var muted = VchapPlayer.getMuted() || VchapPlayer.getVolume() === 0;
    var low   = !muted && VchapPlayer.getVolume() < 0.5;
    if (!volIcon) return;
    if (muted) {
      volIcon.innerHTML = '<path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/>';
    } else if (low) {
      volIcon.innerHTML = '<path d="M18.5 12A4.5 4.5 0 0 0 16 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>';
    } else {
      volIcon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
    }
  }

  /* ── 按钮绑定 ── */
  function _bindButtons() {
    document.getElementById('btn-play').addEventListener('click', function() {
      VchapPlayer.togglePlay();
    });

    document.getElementById('btn-prev').addEventListener('click', function() {
      if (VchapState.currentIdx > 0) {
        if (VchapState.mode === 'full' && VchapState.durLoaded) {
          VchapPlayer.seekGlobal(VchapState.startTimes[VchapState.currentIdx - 1]);
        } else {
          VchapPlayer.loadChapter(VchapState.currentIdx - 1, VchapState.isPlaying);
        }
      }
    });

    document.getElementById('btn-next').addEventListener('click', function() {
      if (VchapState.currentIdx < CHAPTERS.length - 1) {
        if (VchapState.mode === 'full' && VchapState.durLoaded) {
          VchapPlayer.seekGlobal(VchapState.startTimes[VchapState.currentIdx + 1]);
        } else {
          VchapPlayer.loadChapter(VchapState.currentIdx + 1, VchapState.isPlaying);
        }
      }
    });
  }

  /* ── 倍速菜单 ── */
  function _bindSpeed() {
    var opts = document.querySelectorAll('.speed-opt');
    for (var i = 0; i < opts.length; i++) {
      (function(opt) {
        opt.addEventListener('click', function() {
          var s = parseFloat(opt.getAttribute('data-speed'));
          VchapPlayer.setRate(s);
          document.getElementById('speed-btn').textContent = (s === 1) ? '1×' : s + '×';
          for (var j = 0; j < opts.length; j++) {
            opts[j].classList.toggle('active', opts[j] === opt);
          }
        });
      })(opts[i]);
    }
  }

  /* ── 分辨率菜单（由 loadedmetadata 后调用 buildQualityMenu 构建） ── */
  function _bindQuality() {
    var hasHls  = CHAPTERS.some(function(ch) { return !!ch.hls; });
    var hasMp4Q = CHAPTERS.some(function(ch) { return ch.qualities && ch.qualities.length; });
    if (!hasHls && !hasMp4Q) {
      var wrap = document.getElementById('vchap-res-wrap');
      if (wrap) wrap.style.display = 'none';
      return;
    }
    /* MP4 qualities 模式：菜单在初始化时就可构建（不依赖 VHS representations） */
    if (!hasHls && hasMp4Q) _buildMp4QualityMenu();
  }

  /* ── MP4 qualities 菜单（用 qualities[0] 的所有 label 构建，章节间保持一致） ── */
  function _buildMp4QualityMenu() {
    var wrap = document.getElementById('vchap-res-wrap');
    if (!wrap) return;
    var firstQChap = null;
    for (var i = 0; i < CHAPTERS.length; i++) {
      if (CHAPTERS[i].qualities && CHAPTERS[i].qualities.length) { firstQChap = CHAPTERS[i]; break; }
    }
    if (!firstQChap) { wrap.style.display = 'none'; return; }

    var menuInner = wrap.querySelector('.vchap-res-menu-inner');
    menuInner.innerHTML = '';
    firstQChap.qualities.forEach(function(q) {
      var opt = document.createElement('div');
      opt.className = 'vchap-res-opt' + (!VchapState.selectedQualityLabel && firstQChap.qualities[0] === q ? ' active' : '');
      opt.setAttribute('data-mp4-label', q.label);
      opt.textContent = q.label;
      opt.addEventListener('click', function() { VchapPlayer.setMp4Quality(q.label); });
      menuInner.appendChild(opt);
    });
    wrap.style.display = '';
    _updateQualityBtn();
  }

  /* ── 同步 MP4 画质 UI ── */
  function syncMp4QualityUI(label) {
    VchapState.selectedQualityLabel = label;
    var opts = document.querySelectorAll('.vchap-res-opt[data-mp4-label]');
    for (var i = 0; i < opts.length; i++) {
      opts[i].classList.toggle('active', opts[i].getAttribute('data-mp4-label') === label);
    }
    var btn = document.getElementById('vchap-res-btn');
    if (btn) btn.textContent = label;
  }

  /* ── 根据 VHS representations 动态构建画质菜单（每次切章后调用） ── */
  function buildQualityMenu() {
    var wrap = document.getElementById('vchap-res-wrap');
    if (!wrap) return;

    var reps = VchapPlayer.getRepresentations();
    /* MP4 qualities 模式：无 VHS reps，保留已渲染的 MP4 菜单，不隐藏 */
    if (!reps || !reps.length) {
      var hasMp4Q = CHAPTERS.some(function(ch) { return ch.qualities && ch.qualities.length; });
      if (!hasMp4Q) wrap.style.display = 'none';
      return;
    }

    /* 按分辨率高度排序（低→高） */
    var sorted = reps.slice().sort(function(a, b) { return a.height - b.height; });

    var menuInner = wrap.querySelector('.vchap-res-menu-inner');
    menuInner.innerHTML = '';

    /* "自动"选项 */
    var autoOpt = document.createElement('div');
    autoOpt.className = 'vchap-res-opt' + (VchapState.lockedRep === null ? ' active' : '');
    autoOpt.setAttribute('data-rep-id', 'auto');
    autoOpt.textContent = '自动';
    autoOpt.addEventListener('click', function() { VchapPlayer.setQuality(null); });
    menuInner.appendChild(autoOpt);

    /* 各档位选项 */
    sorted.forEach(function(rep) {
      var opt = document.createElement('div');
      opt.className = 'vchap-res-opt' + (VchapState.lockedRep === rep ? ' active' : '');
      opt.setAttribute('data-rep-id', rep.id || rep.height);
      opt.textContent = rep.height + 'P';
      opt.addEventListener('click', function() { VchapPlayer.setQuality(rep); });
      menuInner.appendChild(opt);
    });

    wrap.style.display = '';
    _updateQualityBtn();
    updateQualityBadge();
  }

  /* ── 实时显示当前实际播放分辨率 ── */
  function updateQualityBadge() {
    if (!qualityBadge) return;
    var reps = VchapPlayer.getRepresentations();
    /* 找到当前 enabled 且 bandwidth 最高的（VHS 正在用的那个） */
    var active = null;
    for (var i = 0; i < reps.length; i++) {
      if (reps[i].enabled()) {
        if (!active || reps[i].bandwidth > active.bandwidth) active = reps[i];
      }
    }
    if (!active) {
      qualityBadge.classList.remove('visible');
      return;
    }
    qualityBadge.textContent = active.height + 'P';
    qualityBadge.classList.add('visible');
  }

  /* ── 画质按钮文字 & 选项高亮同步 ── */
  function syncQualityUI(lockedRep) {
    VchapState.lockedRep = lockedRep !== undefined ? lockedRep : VchapState.lockedRep;
    _updateQualityBtn();
    var opts = document.querySelectorAll('.vchap-res-opt');
    for (var i = 0; i < opts.length; i++) {
      var id  = opts[i].getAttribute('data-rep-id');
      var rep = VchapState.lockedRep;
      opts[i].classList.toggle('active',
        rep === null
          ? id === 'auto'
          : String(rep.id || rep.height) === String(id)
      );
    }
  }

  function _updateQualityBtn() {
    var btn = document.getElementById('vchap-res-btn');
    if (!btn) return;
    /* MP4 qualities 模式 */
    if (VchapState.selectedQualityLabel) {
      btn.textContent = VchapState.selectedQualityLabel;
      return;
    }
    /* HLS / VHS 模式 */
    btn.textContent = VchapState.lockedRep === null
      ? '自动'
      : VchapState.lockedRep.height + 'P';
  }

  /* ── 音量 ── */
  function _bindVolume() {
    var slider = document.getElementById('vol-slider');
    slider.addEventListener('input', function() {
      var v = parseFloat(slider.value);
      VchapPlayer.setVolume(v);
      VchapPlayer.setMuted(v === 0);
    });
    document.getElementById('btn-mute').addEventListener('click', function() {
      var m = !VchapPlayer.getMuted();
      VchapPlayer.setMuted(m);
      if (!m && VchapPlayer.getVolume() === 0) {
        VchapPlayer.setVolume(0.5);
        slider.value = 0.5;
      }
    });
  }

  /* ── 音量 UI 同步 ── */
  function syncVolumeUI() {
    updateVolIcon();
    var slider = document.getElementById('vol-slider');
    if (slider) slider.value = VchapPlayer.getMuted() ? 0 : VchapPlayer.getVolume();
  }

  /* ── 倍速 UI 同步 ── */
  function syncRateUI() {
    var r = VchapState.currentRate;
    var btn = document.getElementById('speed-btn');
    if (btn) btn.textContent = (r === 1) ? '1×' : r + '×';
    var opts = document.querySelectorAll('.speed-opt');
    for (var i = 0; i < opts.length; i++) {
      opts[i].classList.toggle('active', parseFloat(opts[i].getAttribute('data-speed')) === r);
    }
  }

  /* ── 加载动画显隐 ── */
  function setLoading(on) {
    if (loadingEl) loadingEl.style.display = on ? 'flex' : 'none';
  }

  /* ── 错误提示显示 ── */
  function showError(msg) {
    if (!errorOverlay) return;
    var msgEl = errorOverlay.querySelector('.error-msg');
    if (msgEl) msgEl.textContent = msg;
    errorOverlay.style.display = 'flex';
    errorOverlay.onclick = function() {
      errorOverlay.style.display = 'none';
    };
  }

  /* ── 全屏 ── */
  function _bindFullscreen() {
    document.getElementById('btn-fs').addEventListener('click', function() {
      if (VchapPlayer.isFullscreen()) {
        VchapPlayer.exitFullscreen();
      } else {
        VchapPlayer.requestFullscreen();
      }
    });

    document.addEventListener('fullscreenchange', function() {
      var icon = document.getElementById('fs-icon');
      if (!icon) return;
      icon.innerHTML = document.fullscreenElement
        ? '<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>'
        : '<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>';
    });
  }

  /* ── 键盘快捷键 ── */
  function _bindKeyboard() {
    document.addEventListener('keydown', function(e) {
      var tag = document.activeElement ? document.activeElement.tagName : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        VchapPlayer.togglePlay();

      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (VchapState.mode === 'full' && VchapState.durLoaded) {
          VchapPlayer.seekGlobal(VchapState.startTimes[VchapState.currentIdx] + VchapPlayer.currentTime() + 5);
        } else {
          VchapPlayer.seekLocal(VchapPlayer.currentTime() + 5);
        }

      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (VchapState.mode === 'full' && VchapState.durLoaded) {
          VchapPlayer.seekGlobal(Math.max(0, VchapState.startTimes[VchapState.currentIdx] + VchapPlayer.currentTime() - 5));
        } else {
          VchapPlayer.seekLocal(Math.max(0, VchapPlayer.currentTime() - 5));
        }

      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        var v = Math.min(1, VchapPlayer.getVolume() + 0.1);
        VchapPlayer.setVolume(v);
        syncVolumeUI();

      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        var vd = Math.max(0, VchapPlayer.getVolume() - 0.1);
        VchapPlayer.setVolume(vd);
        syncVolumeUI();

      } else if (e.key === 'f') {
        document.getElementById('btn-fs').click();
      } else if (e.key === 'm') {
        document.getElementById('btn-mute').click();
      }
    });
  }

  /* ── 过渡效果开关 ── */
  function _bindTransitionToggle() {
    var toggle = document.getElementById('transition-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', function() {
      VchapState.transitionOn = !VchapState.transitionOn;
      var t = toggle.querySelector('.toggle-track');
      if (t) t.classList.toggle('on', VchapState.transitionOn);
    });
  }

  return {
    init:             init,
    updateProgress:   updateProgress,
    renderMarkers:    renderMarkers,
    updatePlayIcon:   updatePlayIcon,
    updateVolIcon:    updateVolIcon,
    syncVolumeUI:     syncVolumeUI,
    syncRateUI:       syncRateUI,
    syncQualityUI:    syncQualityUI,
    syncMp4QualityUI: syncMp4QualityUI,
    buildQualityMenu: buildQualityMenu,
    updateQualityBadge: updateQualityBadge,
    setLoading:       setLoading,
    showError:        showError
  };

})();
