// api/athletes.js
// Reads data/athletes.csv and returns clean JSON.
// To update content: edit athletes.csv and push to GitHub.

const fs   = require('fs');
const path = require('path');
const Papa = require('papaparse');

// Converts Wix wix:image:// URIs → real CDN URLs.
// Plain https:// URLs pass through unchanged.
// /images/filename.jpg paths pass through unchanged (local images).
function resolveImage(raw) {
  if (!raw || raw.trim() === '') return null;
  raw = raw.trim();
  if (raw.startsWith('http') || raw.startsWith('/')) return raw;
  try {
    const withoutScheme = raw.replace('wix:image://v1/', '');
    const imageId = withoutScheme.split('/')[0];
    return `https://static.wixstatic.com/media/${imageId}`;
  } catch (e) {
    return null;
  }
}

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const csvPath = path.join(process.cwd(), 'data', 'athletes.csv');
    const raw = fs.readFileSync(csvPath, 'utf8')
      .replace(/^\uFEFF/, ''); // strip BOM if present

    const { data, errors } = Papa.parse(raw, {
      header: true,
      skipEmptyLines: true,
    });

    if (errors.length) {
      console.warn('CSV parse warnings:', errors.slice(0, 3));
    }

    const athletes = data
      .filter(row => (row['Status'] || '').trim() === 'PUBLISHED')
      .map(row => ({
        name:               (row['The Athlete Name'] || '').trim(),
        origin:             (row['origin'] || '').trim(),
        bio:                (row['Bio'] || '').trim(),
        narratorScript:     (row['narratorScript'] || '').trim(),
        photographerScript: (row['photographerScript'] || '').trim(),
        portrait:           resolveImage(row['portrait']),
        altText:            (row['Image Alt Text'] || row['The Athlete Name'] || '').trim(),
      }));

    return res.status(200).json({ athletes });
  } catch (err) {
    console.error('athletes handler error:', err);
    return res.status(500).json({ error: 'Failed to load athletes: ' + err.message });
  }
};
