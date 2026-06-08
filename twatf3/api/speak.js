// api/speak.js
// Proxies ElevenLabs TTS — API key lives in Vercel Environment Variables only.
// The key never reaches the browser.

// ============================================================
//  ✦  VOICE MAP — edit these if you add or change voices
//     Key = pill label shown in the UI
//     Value = ElevenLabs Voice ID
// ============================================================
const VOICE_MAP = {
  'Narrator':     'Dslrhjl3ZpzrctukrQSN',
  'Photographer': 'N0Ci88MmvOBNWazIX9VN',
  // 'Miles':     'VOICE_ID_HERE',
  // 'Julian':    'VOICE_ID_HERE',
  // 'Max':       'VOICE_ID_HERE',
};

const ELEVENLABS_MODEL = 'eleven_multilingual_v2';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { voiceLabel, text } = req.body || {};

  if (!voiceLabel || !text) {
    return res.status(400).json({ error: 'Missing voiceLabel or text' });
  }

  // ✦ Set ELEVENLABS_API_KEY in Vercel → Settings → Environment Variables
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY environment variable not set' });
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
          text,
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
      console.error('ElevenLabs error:', upstream.status, errText);
      return res.status(upstream.status).json({ error: 'ElevenLabs error ' + upstream.status });
    }

    // Stream raw audio back to browser
    const buffer = await upstream.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(Buffer.from(buffer));

  } catch (err) {
    console.error('speak handler error:', err);
    return res.status(500).json({ error: err.message });
  }
};
