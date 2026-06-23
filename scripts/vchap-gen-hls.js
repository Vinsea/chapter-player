#!/usr/bin/env node
/**
 * vchap-gen-hls.js — 批量生成 HLS 多码率切片
 * @author vinsea
 * @date   2026-06-12
 *
 * 用法：
 *   node vchap-gen-hls.js <config.json>
 *
 * config.json 格式：
 * {
 *   "outBase": "D:/path/to/video-dir/hls",   // HLS 输出根目录（按 chapterKey 建子目录）
 *   "segSeconds": 6,                          // 切片时长（秒），默认 6
 *   "variants": [                             // 码率档位，从低到高排列
 *     { "label": "720P",  "bandwidth": 450000,  "resolution": "1280x720",  "src": "D:/path/to/video-dir/720p/1_720p.mp4" }
 *   ]
 *   ... 每章单独列出（见完整示例）
 * }
 *
 * 实际 config 由各项目自己维护，见 scripts/*.gen-hls.json
 *
 * 依赖：ffmpeg（需在 PATH 中）
 * 特性：
 *   - -c copy 不重新编码，只切片（快！）
 *   - 自动生成每章 master.m3u8（多码率入口）
 *   - 跳过已存在且非空的目录（可安全重跑）
 */

'use strict';

var fs         = require('fs');
var path       = require('path');
var { execSync } = require('child_process');

// ── 读配置 ──────────────────────────────────────────────────────────────────
var configPath = process.argv[2];
if (!configPath) {
  console.error('用法: node vchap-gen-hls.js <config.json>');
  process.exit(1);
}
var cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));

var outBase    = cfg.outBase;
var segSeconds = cfg.segSeconds || 6;
var chapters   = cfg.chapters;

if (!outBase || !chapters || !chapters.length) {
  console.error('[vchap-gen-hls] config 缺少 outBase 或 chapters');
  process.exit(1);
}

// ── 工具 ────────────────────────────────────────────────────────────────────
function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function run(cmd, label) {
  console.log('\n  ▶ ' + label);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (e) {
    console.error('  ✗ 失败: ' + label);
    throw e;
  }
}

// ── 切片单个变体 ─────────────────────────────────────────────────────────────
function sliceVariant(srcFile, variantDir, segSec) {
  var segPattern = path.join(variantDir, 'seg%03d.ts').replace(/\\/g, '/');
  var m3u8       = path.join(variantDir, 'index.m3u8').replace(/\\/g, '/');
  var src        = srcFile.replace(/\\/g, '/');

  var cmd = [
    'ffmpeg -loglevel error -y',
    '-i "' + src + '"',
    '-c copy',
    '-f hls',
    '-hls_time ' + segSec,
    '-hls_list_size 0',
    '-hls_segment_type mpegts',
    '-hls_segment_filename "' + segPattern + '"',
    '"' + m3u8 + '"'
  ].join(' ');

  run(cmd, path.basename(srcFile) + ' → ' + variantDir);
}

// ── 生成 master.m3u8 ─────────────────────────────────────────────────────────
function writeMaster(chapterDir, variants) {
  var lines = ['#EXTM3U', '#EXT-X-VERSION:3', ''];
  variants.forEach(function(v) {
    lines.push(
      '#EXT-X-STREAM-INF:BANDWIDTH=' + v.bandwidth +
      ',RESOLUTION=' + v.resolution +
      ',NAME="' + v.label + '"'
    );
    lines.push(v.label + '/index.m3u8');
    lines.push('');
  });
  var masterPath = path.join(chapterDir, 'master.m3u8');
  fs.writeFileSync(masterPath, lines.join('\n'), 'utf8');
  console.log('  ✓ master.m3u8 → ' + masterPath);
}

// ── 主流程 ───────────────────────────────────────────────────────────────────
var total = chapters.length;
chapters.forEach(function(ch, i) {
  console.log('\n══ 章节 ' + (i + 1) + '/' + total + ': ' + ch.key + ' ══');

  var chapterDir = path.join(outBase, ch.key);
  ensureDir(chapterDir);

  var variants = ch.variants;
  variants.forEach(function(v) {
    var variantDir = path.join(chapterDir, v.label);

    // 跳过已存在且有 index.m3u8 的目录
    var existing = path.join(variantDir, 'index.m3u8');
    if (fs.existsSync(existing)) {
      console.log('  ↷ 已存在，跳过: ' + variantDir);
      return;
    }

    ensureDir(variantDir);
    sliceVariant(v.src, variantDir, segSeconds);
  });

  writeMaster(chapterDir, variants);
});

console.log('\n\n✅ 全部完成！HLS 输出目录: ' + outBase);
