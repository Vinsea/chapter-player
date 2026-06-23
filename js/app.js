/**
 * app.js — 主入口
 * @author vinsea
 * @date   2026-06-12
 *
 * 启动流程：读取 URL ?config=<json_url> → fetch → 填充 CHAPTERS → 初始化各模块
 */

/* ── 模式切换 ── */
function vchapSetMode(m) {
  VchapState.mode = m;
  document.getElementById('page').className = 'page mode-' + m;
  document.getElementById('tab-full').classList.toggle('active',    m === 'full');
  document.getElementById('tab-chapter').classList.toggle('active', m === 'chapter');
  VchapPlayer.loadChapter(VchapState.currentIdx, false);
  VchapSidebar.refresh();
}

/* ── 预加载所有章节时长 ── */
function vchapLoadAllDurations() {
  var results = CHAPTERS.map(function() { return 0; });

  function loadNext(i) {
    if (i >= CHAPTERS.length) {
      var t = 0;
      CHAPTERS.forEach(function(_, j) {
        VchapState.startTimes[j] = t;
        VchapState.durations[j]  = results[j];
        t += results[j];
      });
      VchapState.totalDuration = t;
      VchapState.durLoaded     = true;

      VchapControls.renderMarkers();
      VchapSidebar.refresh();

      document.getElementById('nav-badge').textContent =
        '共 ' + CHAPTERS.length + ' 章 · ' + vchapFmt(VchapState.totalDuration);
      return;
    }

    /* HLS 优先，其次 qualities[0].src，最后 src */
    var ch  = CHAPTERS[i];
    var src = VIDEO_BASE + (
      ch.hls
        ? ch.hls
        : (ch.qualities && ch.qualities.length)
          ? ch.qualities[0].src
          : (ch.src || '')
    );
    vchapGetVideoDuration(src).then(function(dur) {
      results[i] = dur;
      loadNext(i + 1);
    });
  }

  loadNext(0);
}

/* ── 主初始化（配置加载完毕后调用） ── */
function vchapBootstrap() {
  VchapState.init();
  VchapPlayer.init();
  VchapControls.init();
  VchapSidebar.render();
  VchapPlayer.loadChapter(0, false);
  vchapLoadAllDurations();
  document.getElementById('nav-badge').textContent = '共 ' + CHAPTERS.length + ' 章';
}

/* ── 隐藏加载遮罩 ── */
function vchapHideLoading() {
  var el = document.getElementById('app-loading');
  if (!el) return;
  el.classList.add('hidden');
  setTimeout(function() { el.style.display = 'none'; }, 500);
}

/* ── 从 URL 参数加载远程 JSON 配置 ── */
document.addEventListener('DOMContentLoaded', function() {
  var params    = new URLSearchParams(window.location.search);
  var configUrl = params.get('config');

  if (!configUrl) {
    configUrl = 'player.json';
  }

  fetch(configUrl)
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function(data) {
      VIDEO_BASE = data.videoBase || '';
      CHAPTERS   = data.chapters  || [];

      if (data.title) {
        document.title = data.title;
        document.getElementById('nav-logo').textContent = data.title;
      }

      vchapBootstrap();
      vchapHideLoading();
    })
    .catch(function(err) {
      vchapHideLoading();
      document.getElementById('nav-badge').textContent = '配置加载失败';
      console.error('[vchap-config]', err);
    });
});
