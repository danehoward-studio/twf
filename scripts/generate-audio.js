#!/usr/bin/env node
// scripts/generate-audio.js
//
// Run on your Mac to pre-generate all ElevenLabs audio files.
// Saves MP3s to public/audio/ and updates data/cache-manifest.json.
// Commit the generated files to GitHub — Vercel serves them as static assets.
//
// Usage:
//   ELEVENLABS_API_KEY=your_key node scripts/generate-audio.js
//
// Options:
//   --force   Re-encode everything, even if cached and unchanged
//   --dry-run Show what would be encoded without calling the API

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

// ============================================================
//  ✦  VOICE MAP — keep in sync with api/speak.js
//     When you change a voice ID, delete the old MP3 and rerun.
// ============================================================
const VOICE_MAP = {
  'Narrator':     'Dslrhjl3ZpzrctukrQSN',
  'Photographer': 'N0Ci88MmvOBNWazIX9VN',
};

const ELEVENLABS_MODEL = 'eleven_multilingual_v2';
const VOICE_SETTINGS   = { stability: 0.5, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true };

// ── Paths ──
const ROOT          = path.join(__dirname, '..');
const CSV_PATH      = path.join(ROOT, 'data', 'athletes.csv');
const MANIFEST_PATH = path.join(ROOT, 'data', 'cache-manifest.json');
const AUDIO_DIR     = path.join(ROOT, 'public', 'audio');

// ── Args ──
const FORCE   = process.argv.includes('--force');
const DRY_RUN = process.argv.includes('--dry-run');

// ── Helpers ──
function hash(text) {
  return crypto.createHash('md5').update(text || '').digest('hex').slice(0, 12);
}

function slugify(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Inline CSV parser — no npm install needed for this script
function parseCSV(raw) {
  const lines = raw.replace(/^\uFEFF/, '').split('\n');
  const headers = splitLine(lines[0]).map(h => h.replace(/"/g, '').trim());
  return lines.slice(1).filter(l => l.trim()).map(l => {
    const vals = splitLine(l);
    const obj  = {};
    headers.forEach((h, i) => {
      obj[h] = (vals[i] || '').replace(/^"|"$/g, '').replace(/""/g, '"').trim();
    });
    return obj;
  });
}

function splitLine(line) {
  const result = []; let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (c === ',' && !inQ) { result.push(cur); cur = ''; }
    else cur += c;
  }
  result.push(cur);
  return result;
}

async function generateAudio(voiceId, text, outputPath) {
  const apiKey = (process.env.ELEVENLABS_API_KEY || '').trim();
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY env var not set');

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: ELEVENLABS_MODEL, voice_settings: VOICE_SETTINGS }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${err.slice(0, 200)}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buf);
  return buf.length;
}

async function main() {
  console.log('\n── The World at Their Feet · Audio Generator ──────────────\n');
  if (DRY_RUN) console.log('  DRY RUN — no API calls will be made\n');
  if (FORCE)   console.log('  FORCE — re-encoding all files\n');

  // Ensure audio dir exists
  if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

  // Load CSV
  const rows = parseCSV(fs.readFileSync(CSV_PATH, 'utf8'))
    .filter(r => r['Status'] === 'PUBLISHED');
  console.log(`  Athletes: ${rows.length}\n`);

  // Load manifest
  let manifest = { athletes: {} };
  try { manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')); }
  catch (e) { /* first run */ }
  if (!manifest.athletes) manifest.athletes = {};

  // Build work list
  const tasks = [];
  for (const row of rows) {
    const name = row['The Athlete Name'];
    const slug = slugify(name);
    const voices = [
      { label: 'Narrator',     field: 'narratorScript' },
      { label: 'Photographer', field: 'photographerScript' },
    ];
    for (const { label, field } of voices) {
      const text = row[field] || '';
      if (!text.trim()) continue;
      const key      = `${slug}-${label.toLowerCase()}`;
      const mp3Path  = path.join(AUDIO_DIR, `${key}.mp3`);
      const textHash = hash(text);
      const voiceId  = VOICE_MAP[label];
      const voiceHash = hash(voiceId); // include voice ID in cache key
      const fullHash = hash(textHash + voiceHash);
      const cached   = manifest.athletes[key];
      const exists   = fs.existsSync(mp3Path);
      const upToDate = cached && cached.fullHash === fullHash && exists;

      tasks.push({ name, slug, label, field, text, key, mp3Path, voiceId, fullHash, upToDate });
    }
  }

  // Summary
  const toEncode = tasks.filter(t => !t.upToDate || FORCE);
  const skipped  = tasks.filter(t => t.upToDate && !FORCE);

  console.log(`  Up to date : ${skipped.length}`);
  console.log(`  To encode  : ${toEncode.length}`);

  if (toEncode.length === 0) {
    console.log('\n  ✓ Nothing to do. All audio is current.\n');
    return;
  }

  console.log('');

  let encoded = 0, failed = 0;
  for (const task of toEncode) {
    const label = `${task.name} — ${task.label}`;
    if (DRY_RUN) { console.log(`  ○ Would encode: ${label}`); continue; }

    process.stdout.write(`  ⟳ Encoding: ${label} ... `);
    try {
      const bytes = await generateAudio(task.voiceId, task.text, task.mp3Path);
      manifest.athletes[task.key] = {
        fullHash:  task.fullHash,
        voice:     task.label,
        voiceId:   task.voiceId,
        athlete:   task.name,
        generated: new Date().toISOString(),
        bytes,
      };
      // Save manifest after each file in case of interruption
      fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
      console.log(`✓ ${(bytes / 1024).toFixed(0)}kb`);
      encoded++;
      // Polite delay between calls
      if (encoded < toEncode.length) await new Promise(r => setTimeout(r, 800));
    } catch (e) {
      console.log(`✗ FAILED: ${e.message}`);
      failed++;
    }
  }

  console.log('\n── Summary ─────────────────────────────────────────────────');
  console.log(`  ✓ Encoded : ${encoded}`);
  if (failed) console.log(`  ✗ Failed  : ${failed}`);
  console.log(`  ○ Skipped : ${skipped.length}`);
  console.log('\n  Next steps:');
  console.log('    git add public/audio/ data/cache-manifest.json');
  console.log('    git commit -m "Add pre-generated audio"');
  console.log('    git push\n');
}

main().catch(e => { console.error('\nFatal:', e.message); process.exit(1); });
