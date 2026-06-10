// api/speak.js
// Serves pre-generated MP3 files from public/audio/.
// Falls back to live ElevenLabs generation if a file is missing
// (e.g. new athlete added before generate-audio.js was run).
//
// To pre-generate all audio:
//   ELEVENLABS_API_KEY=your_key node scripts/generate-audio.js
//   git add public/audio/ data/cache-manifest.json && git push
//
// ============================================================
//  ✦  VOICE MAP — keep in sync with scripts/generate-audio.js
// ============================================================
const VOICE_MAP = {
  'Narrator':     'Dslrhjl3ZpzrctukrQSN',
  'Photographer': 'N0Ci88MmvOBNWazIX9VN',
};

const ELEVENLABS_MODEL = 'eleven_multilingual_v2';

const fs   = require('fs');
const path = require('path');

function slugify(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { voiceLabel, text, athleteName } = req.body || {};
  if (!voiceLabel || !text || !text.trim() || !athleteName) {
    return res.status(400).json({ error: 'Missing voiceLabel, text, or athleteName' });
  }

  const key     = `${slugify(athleteName)}-${voiceLabel.toLowerCase()}`;
  const mp3Path = path.join(__dirname, '..', 'public', 'audio', `${key}.mp3`);

  // ── 1. Serve pre-generated static file (instant, no API call) ──
  if (fs.existsSync(mp3Path)) {
    console.log(`[speak] static: ${key}`);
    const buf = fs.readFileSync(mp3Path);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Cache', 'STATIC');
    return res.status(200).send(buf);
  }

  // ── 2. Fallback: live ElevenLabs generation ──
  console.log(`[speak] live fallback: ${key} (run generate-audio.js to pre-generate)`);

  const apiKey = (process.env.ELEVENLABS_API_KEY || '').trim();
  if (!apiKey) {
    return res.status(500).json({
      error: `No pre-generated audio found for "${key}" and ELEVENLABS_API_KEY is not set. Run: node scripts/generate-audio.js`
    });
  }

  const voiceId = VOICE_MAP[voiceLabel] || VOICE_MAP['Narrator'];

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
        body: JSON.stringify({
          text: text.trim(),
          model_id: ELEVENLABS_MODEL,
          voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true },
        }),
      }
    );

    if (!upstream.ok) {
      const err = await upstream.text();
      console.error('[speak] ElevenLabs error:', upstream.status, err.slice(0, 200));
      return res.status(upstream.status).json({ error: `ElevenLabs error ${upstream.status}` });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Cache', 'LIVE');
    return res.status(200).send(buffer);

  } catch (err) {
    console.error('[speak] handler error:', err);
    return res.status(500).json({ error: err.message });
  }
};
