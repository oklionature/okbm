#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const USER_ID = 'kakao_5060259862';
const AUTHOR = '오라네';
const INSTAGRAM = 'oklionnature';
const DEFAULT_SPOT = '오라네 아웃도어';
const R2_FEEDS_URL = 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/feeds.json';

function loadSupabaseConfig() {
  const src = fs.readFileSync(path.join(__dirname, 'romantic-sync.js'), 'utf8');
  const url = (src.match(/SUPABASE_URL\s*=\s*window\.SUPABASE_URL\s*\|\|\s*'([^']+)'/) || [])[1];
  const key = (src.match(/SUPABASE_ANON_KEY\s*=\s*window\.SUPABASE_ANON_KEY\s*\|\|\s*'([^']+)'/) || [])[1];
  if (!url || !key) throw new Error('romantic-sync.js에서 SUPABASE_URL / SUPABASE_ANON_KEY를 찾지 못했습니다.');
  return { url, key };
}

function restHeaders(key, extra) {
  var headers = {
    apikey: key,
    Authorization: 'Bearer ' + key,
    'Content-Type': 'application/json'
  };
  if (extra) Object.assign(headers, extra);
  return headers;
}

function extractSpotFromCaption(caption) {
  var lines = String(caption || '').split(/\n+/).map(function (line) {
    return line.replace(/#\S+/g, '').trim();
  }).filter(Boolean);
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].replace(/^[^\w가-힣]+/, '').trim();
    if (line.length < 2) continue;
    if (line.length > 42) line = line.slice(0, 42).trim();
    return line;
  }
  var hash = String(caption || '').match(/#([가-힣A-Za-z0-9]{2,16})/);
  if (hash) return hash[1];
  return DEFAULT_SPOT;
}

function looksLikeFeedTitle(spot) {
  var s = String(spot || '').trim();
  if (s.length < 2) return false;
  if (s === DEFAULT_SPOT) return false;
  return /[가-힣A-Za-z0-9]/.test(s);
}

function resolveSpot(row) {
  var spot = String(row.spot || row.spotName || '').trim();
  if (looksLikeFeedTitle(spot)) return spot;
  return extractSpotFromCaption(row.memo || row.caption || '');
}

function toPhotoList(row) {
  var photos = row.photos;
  if (typeof photos === 'string') {
    try { photos = JSON.parse(photos); } catch (e) { photos = []; }
  }
  if (!Array.isArray(photos) || photos.length === 0) {
    if (typeof row.photos_json === 'string') {
      try { photos = JSON.parse(row.photos_json); } catch (e) { photos = []; }
    } else if (Array.isArray(row.photos_json)) {
      photos = row.photos_json;
    }
  }
  if (!Array.isArray(photos)) photos = [];
  photos = photos.filter(function (u) {
    return typeof u === 'string' && /^https?:\/\//.test(u.trim());
  }).map(function (u) { return u.trim(); });
  if (!photos.length) {
    var single = row.photo || row.photo_url || row.fieldPhoto || '';
    if (typeof single === 'string' && /^https?:\/\//.test(single.trim())) {
      photos = [single.trim()];
    }
  }
  return photos;
}

function normalizeDateDot(raw) {
  var s = String(raw || '').trim();
  var m = s.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!m) return s.replace(/\s+/g, '');
  return m[1] + '.' + String(m[2]).padStart(2, '0') + '.' + String(m[3]).padStart(2, '0');
}

function parseCreatedAt(row) {
  var id = String(row.id || '');
  var idTs = id.match(/^feed_insta_(\d{10,13})/);
  if (idTs) {
    var n = Number(idTs[1]);
    if (n < 1e12) n *= 1000;
    var fromId = new Date(n);
    if (!isNaN(fromId.getTime())) return fromId;
  }
  var created = String(row.createdAt || row.created_at || '').trim();
  if (created) {
    var normalized = created.replace(/\./g, '-').replace(/\s+/g, ' ').replace(/-(\d{2}):/, ' $1:');
    var d = new Date(normalized);
    if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d;
  }
  var dateOnly = normalizeDateDot(row.date);
  var dm = dateOnly.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (dm) return new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]));
  return new Date();
}

function parseItems(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
}

function parsePhotoMemos(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch (e) { return {}; }
  }
  return {};
}

function buildPayload(row, index, authorPhoto) {
  var photos = toPhotoList(row);
  var createdAt = parseCreatedAt(row);
  var iso = createdAt.toISOString();
  var id = String(row.id || '').trim() || ('pack_' + createdAt.getTime() + '_' + index);
  var instagram = String(row.instagram || INSTAGRAM).replace(/^@/, '').trim() || INSTAGRAM;
  return {
    id: id,
    user_id: USER_ID,
    author: AUTHOR,
    author_photo: authorPhoto || String(row.authorPhoto || '').trim() || '',
    spot: resolveSpot(row),
    elevation: String(row.elevation || '').trim(),
    weight_kg: parseFloat(row.weightKg || row.weight_kg || 0) || 0,
    date: normalizeDateDot(row.date) || iso.slice(0, 10).replace(/-/g, '.'),
    memo: String(row.memo || '').trim(),
    template_id: parseInt(row.templateId || row.template_id || 1, 10) || 1,
    likes_count: parseInt(row.likes || row.likes_count || 0, 10) || 0,
    created_at: iso,
    updated_at: iso,
    instagram: instagram,
    is_published: true,
    photos: photos,
    photo: photos[0] || String(row.photo || '').trim() || '',
    items: parseItems(row.items),
    photo_memos_json: parsePhotoMemos(row.photoMemos || row.photo_memos_json),
    ready_shot_photo: null,
    ready_shot_mode: 'none',
    feed_type: String(row.feedType || row.feed_type || 'outdoor')
  };
}

async function fetchAuthorPhoto(url, key) {
  try {
    var res = await fetch(url + '/rest/v1/users?id=eq.' + encodeURIComponent(USER_ID) + '&select=photo_url', {
      headers: restHeaders(key)
    });
    if (!res.ok) return '';
    var rows = await res.json();
    var photo = rows && rows[0] && rows[0].photo_url ? String(rows[0].photo_url).trim() : '';
    return photo.indexOf('https://') === 0 ? photo : '';
  } catch (err) {
    console.warn('[restore] users.photo_url 조회 실패:', err.message || err);
    return '';
  }
}

async function deleteCurrentUserFeeds(url, key) {
  var res = await fetch(url + '/rest/v1/feeds?user_id=eq.' + encodeURIComponent(USER_ID), {
    method: 'DELETE',
    headers: restHeaders(key, { Prefer: 'return=representation' })
  });
  var bodyText = '';
  try { bodyText = await res.text(); } catch (e) {}
  if (!res.ok) {
    throw new Error('기존 피드 삭제 실패 HTTP ' + res.status + ' ' + bodyText.slice(0, 300));
  }
  var deleted = [];
  try { deleted = JSON.parse(bodyText); } catch (e) {}
  return Array.isArray(deleted) ? deleted.length : 0;
}

async function insertFeed(url, key, payload) {
  var res = await fetch(url + '/rest/v1/feeds', {
    method: 'POST',
    headers: restHeaders(key, {
      Prefer: 'resolution=merge-duplicates,return=representation'
    }),
    body: JSON.stringify(payload)
  });
  var bodyText = '';
  try { bodyText = await res.text(); } catch (e) {}
  if (!res.ok) {
    throw new Error('feeds INSERT HTTP ' + res.status + ' ' + bodyText.slice(0, 400));
  }
}

async function loadOriginalFeeds() {
  var res = await fetch(R2_FEEDS_URL + '?_t=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) throw new Error('feeds.json HTTP ' + res.status);
  var rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('feeds.json이 비어 있습니다.');
  }
  return rows.filter(function (row) {
    if (!row) return false;
    var uid = String(row.userId || row.user_id || '').trim();
    var author = String(row.author || '').trim();
    return uid === USER_ID || uid.indexOf('5060259862') !== -1 || author === AUTHOR;
  });
}

async function main() {
  var cfg = loadSupabaseConfig();
  var originals = await loadOriginalFeeds();
  console.log('[restore] 소스: ' + R2_FEEDS_URL);
  console.log('[restore] 오라네 원본 피드:', originals.length + '건');

  var deleted = await deleteCurrentUserFeeds(cfg.url, cfg.key);
  console.log('[restore] 지금 올린 피드 삭제:', deleted + '건');

  var authorPhoto = await fetchAuthorPhoto(cfg.url, cfg.key);
  var total = originals.length;
  var success = 0;
  var skipped = 0;
  var failed = 0;

  for (var i = 0; i < originals.length; i++) {
    var row = originals[i];
    var payload = buildPayload(row, i, authorPhoto);
    if (!payload.photos.length) {
      skipped += 1;
      console.log('[restore] skip 사진 없음', (i + 1) + '/' + total, payload.spot);
      continue;
    }
    try {
      await insertFeed(cfg.url, cfg.key, payload);
      success += 1;
      console.log('[restore] 성공', (i + 1) + '/' + total, payload.id, payload.spot, payload.photos.length + '장');
    } catch (err) {
      failed += 1;
      console.error('[restore] 실패', (i + 1) + '/' + total, payload.spot, err.message || err);
    }
  }

  console.log('========================================');
  console.log('[restore] 총 ' + total + '건 중 성공 ' + success + '건 / 스킵 ' + skipped + '건 / 실패 ' + failed + '건');
  console.log('========================================');
  if (failed > 0) process.exitCode = 1;
}

main().catch(function (err) {
  console.error('[restore] 중단:', err.stack || err);
  process.exit(1);
});
