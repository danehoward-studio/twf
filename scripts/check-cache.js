#!/usr/bin/env node
// scripts/check-cache.js
//
// Run:  npm run check-cache
//
// Reads data/athletes.csv, hashes each narratorScript and photographerScript,
// compares to data/cache-manifest.json, and:
//   - Reports what is new or changed
//   - DELETES the old MP3 for anything that has changed
//     so the next play triggers a fresh ElevenLabs encode
//
// Only narratorScript and photographerScript are checked.
// Other field changes (bio, origin, portrait) do NOT invalidate audio cache.

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

// Inline CSV parser — no dependency needed for the build script
function parseCSV(raw) {
  const lines = raw.replace(/^\uFEFF/, '').split('\n');
  const headers = splitCSVLine(lines[0]);
  return lines.slice(1)
    .filter(l => l.trim())
    .map(l => {
      const vals = splitCSVLine(l);
      const obj = {};
      headers.forEach((h, i) => { obj[h.replace(/"/g, '').trim()] = (vals[i] || '').replace(/^"|"$/g, '').trim(); });
      return obj;
    });
}

function splitCSVLine(line) {
  const result = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i+1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (c === ',' && !inQuote) {
      result.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

function hash(text) {
  return crypto.createHash('md5').update(text || '').digest('hex').slice(0, 8);
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const ROOT          = path.join(__dirname, '..');
const CSV_PATH      = path.join(ROOT, 'data', 'athletes.csv');
const MANIFEST_PATH = path.join(ROOT, 'data', 'cache-manifest.json');
const AUDIO_DIR     = path.join(ROOT, 'public', 'audio');

const raw      = fs.readFileSync(CSV_PATH, 'utf8');
const rows     = parseCSV(raw).filter(r => r['Status'] === 'PUBLISHED');
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

if (!manifest.athletes) manifest.athletes = {};

let newCount     = 0;
let changedCount = 0;
let okCount      = 0;
let deletedFiles = [];

console.log('\n── Cache Check ────────────────────────────────');
console.log(`   CSV athletes (PUBLISHED): ${rows.length}\n`);

rows.forEach(row => {
  const name = row['The Athlete Name'];
  const slug = slugify(name);

  ['narrator', 'photographer'].forEach(voice => {
    const field  = voice === 'narrator' ? 'narratorScript' : 'photographerScript';
    const text   = row[field] || '';
    const newHash = hash(text);
    const key    = `${slug}-${voice}`;
    const mp3    = path.join(AUDIO_DIR, `${key}.mp3`);
    const exists  = fs.existsSync(mp3);
    const cached  = manifest.athletes[key];

    if (!cached) {
      console.log(`  ✦ NEW      ${key}`);
      newCount++;
    } else if (cached.hash !== newHash) {
      console.log(`  ↻ CHANGED  ${key}  (${cached.hash} → ${newHash})`);
      // Delete old MP3 so next play re-encodes
      if (exists) {
        fs.unlinkSync(mp3);
        deletedFiles.push(`${key}.mp3`);
        console.log(`             └─ deleted cached MP3`);
      }
      // Remove from manifest so it's treated as uncached
      delete manifest.athletes[key];
      changedCount++;
    } else if (!exists) {
      console.log(`  ? MISSING  ${key}  (in manifest but MP3 gone)`);
      delete manifest.athletes[key];
      newCount++;
    } else {
      okCount++;
    }
  });
});

// Save updated manifest
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

console.log('\n── Summary ─────────────────────────────────────');
console.log(`   ✓ Up to date : ${okCount}`);
console.log(`   ✦ New        : ${newCount}  (will encode on first play)`);
console.log(`   ↻ Changed    : ${changedCount}  (old MP3 deleted, will re-encode on next play)`);
if (deletedFiles.length) {
  console.log(`\n   Deleted files:`);
  deletedFiles.forEach(f => console.log(`     - public/audio/${f}`));
}
console.log('\n   Run the app and play each athlete to generate missing audio.\n');
