// api/athletes.js
// Reads /data/athletes.csv and returns clean JSON
// To add or update athletes: edit athletes.csv and push to GitHub

import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

// Converts Wix internal image URIs to real CDN URLs
// Also passes through any real https:// URLs unchanged
function resolveImage(raw) {
  if (!raw) return null;
  if (raw.startsWith('http')) return raw;
  try {
    const withoutScheme = raw.replace('wix:image://v1/', '');
    const imageId = withoutScheme.split('/')[0];
    return `https://static.wixstatic.com/media/${imageId}`;
  } catch {
    return null;
  }
}

export default function handler(req, res) {
  // CORS — allows the page to call this from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const csvPath = path.join(process.cwd(), 'data', 'athletes.csv');
    const raw = fs.readFileSync(csvPath, 'utf8');

    const { data } = Papa.parse(raw, {
      header: true,
      skipEmptyLines: true,
    });

    // Filter to only PUBLISHED rows, map to clean shape
    const athletes = data
      .filter(row => row['Status'] === 'PUBLISHED')
      .map(row => ({
        name:               row['The Athlete Name'],
        origin:             row['origin'],
        bio:                row['Bio'],
        narratorScript:     row['narratorScript'],
        photographerScript: row['photographerScript'],
        portrait:           resolveImage(row['portrait']),
        altText:            row['Image Alt Text'] || row['The Athlete Name'],
      }));

    res.status(200).json({ athletes });
  } catch (err) {
    console.error('CSV read error:', err);
    res.status(500).json({ error: 'Failed to load athletes data' });
  }
}
