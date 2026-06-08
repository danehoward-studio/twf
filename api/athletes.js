const fs   = require('fs');
const path = require('path');
const Papa = require('papaparse');

function resolveImage(raw) {
  if (!raw || raw.trim() === '') return null;
  raw = raw.trim();
  if (raw.startsWith('http') || raw.startsWith('/')) return raw;
  try {
    const withoutScheme = raw.replace('wix:image://v1/', '');
    const imageId = withoutScheme.split('/')[0];
    return `https://static.wixstatic.com/media/${imageId}`;
  } catch (e) { return null; }
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const csvPath = path.join(__dirname, '..', 'data', 'athletes.csv');
    const raw = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
    const { data } = Papa.parse(raw, { header: true, skipEmptyLines: true });

    const athletes = data
      .filter(row => (row['Status'] || '').trim() === 'PUBLISHED')
      .map(row => ({
        slug:               slugify((row['The Athlete Name'] || '').trim()),
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
    console.error('athletes error:', err);
    return res.status(500).json({ error: err.message });
  }
};
