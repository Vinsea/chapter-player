/**
 * sidebar.js — 侧边栏模块
 * @author vinsea
 * @date   2026-06-12
 *
 * 负责：章节列表渲染、当前章节高亮、总进度更新
 */

var VchapSidebar = (function() {

  /* ── 完整渲染章节列表 ── */
  function render() {
    var list = document.getElementById('ch-list');
    list.innerHTML = '';

    CHAPTERS.forEach(function(ch, i) {
      var item = document.createElement('div');
      item.id  = 'chi-' + i;
      item.className = 'ch-item' +
        (i === VchapState.currentIdx ? ' active'  : '') +
        (VchapState.isWatched(i)     ? ' watched' : '') +
        (i === VchapState.currentIdx && VchapState.isPlaying ? ' playing' : '');

      var ts  = VchapState.durLoaded ? vchapFmt(VchapState.startTimes[i]) : '—';
      var dur = (VchapState.durLoaded && VchapState.durations[i]) ? vchapFmt(VchapState.durations[i]) : '—';

      item.innerHTML =
        '<div class="ch-num">' + _pad2(i + 1) + '</div>' +
        '<div class="ch-info">' +
        '  <div class="ch-title">' + _esc(ch.title) + '</div>' +
        '  <div class="ch-meta">' +
        '    <span class="ch-ts"  id="ts-'  + i + '">' + ts  + '</span>' +
        '    <span class="ch-dur" id="dur-' + i + '">' + dur + '</span>' +
        '    <span class="ch-rem" id="rem-' + i + '"></span>' +
        '    <span class="live-dot"></span>' +
        '  </div>' +
        '</div>';

      (function(idx) {
        item.addEventListener('click', function() {
          if (VchapState.mode === 'full' && VchapState.durLoaded) {
            VchapPlayer.seekGlobal(VchapState.startTimes[idx]);
          } else {
            VchapPlayer.loadChapter(idx, true);
          }
        });
      })(i);

      list.appendChild(item);
    });

    var sub = document.getElementById('sidebar-sub');
    if (sub) {
      sub.textContent = '共 ' + CHAPTERS.length + ' 章节' +
        (VchapState.durLoaded ? ' · ' + vchapFmt(VchapState.totalDuration) : '');
    }
  }

  /* ── 仅刷新高亮 & 进度（不重建 DOM） ── */
  function refresh() {
    updateActive();
    CHAPTERS.forEach(function(_, i) {
      var tsEl  = document.getElementById('ts-'  + i);
      var durEl = document.getElementById('dur-' + i);
      if (tsEl  && VchapState.durLoaded) tsEl.textContent  = vchapFmt(VchapState.startTimes[i]);
      if (durEl && VchapState.durLoaded && VchapState.durations[i]) {
        durEl.textContent = vchapFmt(VchapState.durations[i]);
      }
    });
  }

  /* ── 更新激活章节高亮 ── */
  function updateActive() {
    CHAPTERS.forEach(function(_, i) {
      var el = document.getElementById('chi-' + i);
      if (!el) return;
      el.classList.toggle('active',   i === VchapState.currentIdx);
      el.classList.toggle('playing',  i === VchapState.currentIdx && VchapState.isPlaying);
      el.classList.toggle('watched',  VchapState.isWatched(i) && i !== VchapState.currentIdx);
    });

    var remEl = document.getElementById('rem-' + VchapState.currentIdx);
    if (remEl && VchapState.isPlaying) {
      var rem = VchapPlayer.remainingTime();
      remEl.textContent = rem > 0 ? '-' + vchapFmt(rem) : '';
    }

    var active = document.getElementById('chi-' + VchapState.currentIdx);
    if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function _pad2(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function _esc(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return {
    render:       render,
    refresh:      refresh,
    updateActive: updateActive
  };

})();
