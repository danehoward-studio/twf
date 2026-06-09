// api/speak.js
// Streams audio from ElevenLabs.
// In-memory cache per serverless instance — repeated plays in the same
// session are instant. Vercel's read-only filesystem means we can't
// persist MP3s between cold starts, so each new instance fetches once.
//
// ✦  VOICE MAP — edit voice IDs here
const VOICE_MAP = {
  'Narrator':     'Dslrhjl3ZpzrctukrQSN',
  'Photographer': 'N0Ci88MmvOBNWazIX9VN',
  // Add more voices:
  // 'Miles':   'VOICE_ID_HERE',
  // 'Julian':  'VOICE_ID_HERE',
};

const ELEVENLABS_MODEL = 'eleven_multilingual_v2';

// In-memory cache: survives for the lifetime of this serverless instance
// Key: athleteSlug-voicekey, Value: Buffer
const memCache = new Map();

function slugify(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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

  const cacheKey = `${slugify(athleteName)}-${voiceLabel.toLowerCase()}`;

  // ── SERVE FROM IN-MEMORY CACHE ──
  if (memCache.has(cacheKey)) {
    console.log(`[speak] mem-cache hit: ${cacheKey}`);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).send(memCache.get(cacheKey));
  }

  // ── GENERATE via ElevenLabs ──
  console.log(`[speak] generating: ${cacheKey}`);

  const apiKey = (process.env.ELEVENLABS_API_KEY || '').trim();
  if (!apiKey) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured in Vercel Environment Variables' });
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
      return res.status(upstream.status).json({
        error: `ElevenLabs error ${upstream.status} — check your API key in Vercel Environment Variables`
      });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());

    // Store in memory for this instance's lifetime
    memCache.set(cacheKey, buffer);
    console.log(`[speak] cached in memory: ${cacheKey} (${buffer.length} bytes)`);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).send(buffer);

  } catch (err) {
    console.error('[speak] handler error:', err);
    return res.status(500).json({ error: err.message });
  }
};
