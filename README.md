# The World at Their Feet — v2.7
Photography by Ira L. Black · Art Direction by Dane Howard Studio

---

## Audio Workflow

Audio is **pre-generated once** and served as static MP3 files — zero ElevenLabs API calls at playback time. Fast, cheap, reliable.

### First-time setup (or after script/voice changes)

```bash
# From inside your repo folder in Terminal:
ELEVENLABS_API_KEY=your_key node scripts/generate-audio.js
```

This reads `data/athletes.csv`, encodes each narrator and photographer script, saves MP3s to `public/audio/`, and updates `data/cache-manifest.json`.

Then commit and push:
```bash
git add public/audio/ data/cache-manifest.json
git commit -m "Add pre-generated audio"
git push
```

Vercel deploys the MP3s as static files — instant playback for users.

### When to re-run

| Change | Action |
|---|---|
| Edit a narrator or photographer script in CSV | `node scripts/generate-audio.js` — detects changes, only re-encodes what changed |
| Add a new athlete to CSV | `node scripts/generate-audio.js` — encodes only the new athlete |
| Change a voice ID in `api/speak.js` and `scripts/generate-audio.js` | `node scripts/generate-audio.js --force` — re-encodes all files for that voice |
| Finalize scripts, encode everything fresh | `node scripts/generate-audio.js --force` |

### Dry run (preview without encoding)

```bash
ELEVENLABS_API_KEY=your_key node scripts/generate-audio.js --dry-run
```

---

## Update Athlete Content

1. Edit `data/athletes.csv` in Excel or Google Sheets
2. Save as CSV, replace `data/athletes.csv` in the repo
3. Run `node scripts/generate-audio.js` to encode new/changed audio
4. `git add . && git commit -m "Update athletes" && git push`

### CSV Columns
| Column | Purpose |
|---|---|
| `Status` | `PUBLISHED` = visible |
| `The Athlete Name` | Display name |
| `origin` | e.g. "Atlanta, GA - Defender" |
| `Bio` | Short bio in player panel |
| `narratorScript` | Text spoken by Narrator voice |
| `photographerScript` | Text spoken by Photographer voice |
| `portrait` | Image URL or Wix URI |

---

## Change Voice IDs

Edit both files — they must stay in sync:

**`api/speak.js`**
```js
const VOICE_MAP = {
  'Narrator':     'YOUR_NARRATOR_VOICE_ID',
  'Photographer': 'YOUR_PHOTOGRAPHER_VOICE_ID',
};
```

**`scripts/generate-audio.js`**
```js
const VOICE_MAP = {
  'Narrator':     'YOUR_NARRATOR_VOICE_ID',
  'Photographer': 'YOUR_PHOTOGRAPHER_VOICE_ID',
};
```

Then re-encode:
```bash
ELEVENLABS_API_KEY=your_key node scripts/generate-audio.js --force
git add public/audio/ data/cache-manifest.json
git commit -m "Re-encode with new voice IDs"
git push
```

---

## First Deploy to Vercel

```bash
git init && git add . && git commit -m "Initial deploy"
git remote add origin https://github.com/YOUR/REPO.git
git push -u origin main
```

Vercel → New Project → Import → Framework: **Other** → Deploy

Add env variable: `ELEVENLABS_API_KEY` → your key → Redeploy
(Only needed as a fallback for any athlete missing a pre-generated file)
