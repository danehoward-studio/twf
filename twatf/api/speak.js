// api/speak.js
// Proxies ElevenLabs TTS requests — API key never reaches the browser

// ============================================================
//  ✦  VOICE MAP — edit voice IDs here if they change
//     These are looked up by the label sent from the frontend
// ============================================================
const VOICE_MAP = {
  'Narrator':     'Dslrhjl3ZpzrctukrQSN',
  'Photographer': 'N0Ci88MmvOBNWazIX9VN',
};

const ELEVENLABS_MODEL = 'eleven_multilingual_v2';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { voiceLabel, text } = req.body;

  if (!voiceLabel || !text) {
    return res.status(400).json({ error: 'Missing voiceLabel or text' });
  }

  // ✦ API key lives in Vercel Environment Variables — never in code
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ElevenLabs API key not configured' });
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
      const err = await upstream.text();
      console.error('ElevenLabs error:', upstream.status, err);
      return res.status(upstream.status).json({ error: 'ElevenLabs error: ' + upstream.status });
    }

    // Stream audio directly back to the browser
    const audioBuffer = await upstream.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(Buffer.from(audioBuffer));

  } catch (err) {
    console.error('Speak handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
