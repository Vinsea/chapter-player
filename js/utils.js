/**
 * utils.js — 工具函数
 * @author vinsea
 * @date   2026-06-12
 */

/**
 * 将秒数格式化为 m:ss 或 h:mm:ss
 * @param {number} s 秒数
 * @returns {string}
 */
function vchapFmt(s) {
  if (!s || isNaN(s) || !isFinite(s)) return '0:00';
  s = Math.floor(s);
  var h   = Math.floor(s / 3600);
  var m   = Math.floor((s % 3600) / 60);
  var sec = s % 60;
  if (h > 0) {
    return h + ':' + vchapPad(m) + ':' + vchapPad(sec);
  }
  return m + ':' + vchapPad(sec);
}

/**
 * 数字补零（两位）
 * @param {number} n
 * @returns {string}
 */
function vchapPad(n) {
  return n < 10 ? '0' + n : '' + n;
}

/**
 * 获取视频时长：
 *   - HLS（.m3u8）：fetch 解析 #EXTINF 累加，不需要 video 元素
 *   - MP4：用隐藏 video 元素 loadedmetadata
 * @param {string} src
 * @returns {Promise<number>}
 */
function vchapGetVideoDuration(src) {
  if (src && src.indexOf('.m3u8') !== -1) {
    return vchapGetHlsDuration(src);
  }
  return new Promise(function(resolve) {
    var v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = function() {
      resolve(isFinite(v.duration) ? v.duration : 0);
      v.src = '';
    };
    v.onerror = function() { resolve(0); };
    v.src = src;
  });
}

/**
 * 解析 HLS m3u8（media playlist 或 master→第一个 variant）累加 #EXTINF 得到时长
 * @param {string} url
 * @returns {Promise<number>}
 */
function vchapGetHlsDuration(url) {
  return fetch(url)
    .then(function(res) { return res.text(); })
    .then(function(text) {
      /* master playlist → 取第一个 variant URL 递归解析 */
      if (text.indexOf('#EXT-X-STREAM-INF') !== -1) {
        var lines = text.split('\n');
        for (var i = 0; i < lines.length; i++) {
          var l = lines[i].trim();
          if (l && l[0] !== '#') {
            var variantUrl = l.indexOf('://') !== -1
              ? l
              : url.replace(/\/[^\/]*$/, '/') + l;
            return vchapGetHlsDuration(variantUrl);
          }
        }
        return 0;
      }
      /* media playlist → 累加所有 #EXTINF */
      var total = 0;
      var re = /#EXTINF:([\d.]+)/g;
      var m;
      while ((m = re.exec(text)) !== null) {
        total += parseFloat(m[1]);
      }
      return total;
    })
    .catch(function() { return 0; });
}
