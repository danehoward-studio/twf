// api/speak.js
// First call: generates audio via ElevenLabs, saves MP3 to public/audio/, updates manifest
// Subsequent calls: serves cached MP3 directly — zero ElevenLabs API calls
//
// Cache key: public/audio/{athleteSlug}-{narrator|photographer}.mp3

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

// ============================================================
//  ✦  VOICE MAP — edit voice IDs here
// ============================================================
const VOICE_MAP = {
  'Narrator':     'Dslrhjl3ZpzrctukrQSN',
  'Photographer': 'N0Ci88MmvOBNWazIX9VN',
};

const ELEVENLABS_MODEL = 'eleven_multilingual_v2';

function hash(text) {
  return crypto.createHash('md5').update(text || '').digest('hex').slice(0, 8);
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { voiceLabel, text, athleteName } = req.body || {};

  if (!voiceLabel || !text || !text.trim() || !athleteName) {
    return res.status(400).json({ error: 'Missing voiceLabel, text, or athleteName' });
  }

  const slug      = slugify(athleteName);
  const voiceKey  = voiceLabel.toLowerCase(); // 'narrator' or 'photographer'
  const cacheKey  = `${slug}-${voiceKey}`;
  const audioDir  = path.join(__dirname, '..', 'public', 'audio');
  const mp3Path   = path.join(audioDir, `${cacheKey}.mp3`);
  const manifestPath = path.join(__dirname, '..', 'data', 'cache-manifest.json');

  // Ensure audio dir exists
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

  // Load manifest
  let manifest = { athletes: {} };
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (!manifest.athletes) manifest.athletes = {};
  } catch (e) { /* first run, manifest doesn't exist yet */ }

  const currentHash = hash(text);
  const cached = manifest.athletes[cacheKey];
  const mp3Exists = fs.existsSync(mp3Path);

  // ── SERVE CACHED MP3 if hash matches and file exists ──
  if (cached && cached.hash === currentHash && mp3Exists) {
    console.log(`[speak] cache hit: ${cacheKey}`);
    const audioBuffer = fs.readFileSync(mp3Path);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).send(audioBuffer);
  }

  // ── GENERATE via ElevenLabs ──
  console.log(`[speak] cache miss — generating: ${cacheKey}`);

  const apiKey = (process.env.ELEVENLABS_API_KEY || '').trim();
  if (!apiKey) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY not set in Vercel environment variables' });
  }

  const voiceId = VOICE_MAP[voiceLabel] || VOICE_MAP['Narrator'];

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: ELEVENLABS_MODEL,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error('[speak] ElevenLabs error:', upstream.status, errText);
      return res.status(upstream.status).json({ error: 'ElevenLabs error ' + upstream.status });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());

    // Save to cache
    fs.writeFileSync(mp3Path, buffer);

    // Update manifest
    manifest.athletes[cacheKey] = {
      hash: currentHash,
      generated: new Date().toISOString(),
      voice: voiceLabel,
      athlete: athleteName,
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`[speak] saved: public/audio/${cacheKey}.mp3`);

    // Serve the freshly generated audio
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).send(buffer);

  } catch (err) {
    console.error('[speak] handler error:', err);
    return res.status(500).json({ error: err.message });
  }
};
