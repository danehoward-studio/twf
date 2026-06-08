# The World at Their Feet
**Photography by Ira L. Black · Art Direction by Dane Howard Studio**

Live companion page for the soccer photography book — athlete gallery with ElevenLabs audio interviews and a prints/merch tray.

---

## Project Structure

```
/
├── api/
│   ├── athletes.js      ← reads data/athletes.csv → returns JSON
│   └── speak.js         ← proxies ElevenLabs TTS (key stays server-side)
├── data/
│   └── athletes.csv     ← ✦ THIS IS YOUR CONTENT FILE — edit to update athletes
├── public/
│   └── index.html       ← the full frontend page
├── package.json
└── vercel.json
```

---

## How to Update Content

1. Open `data/athletes.csv` in Excel, Google Sheets, or any text editor
2. Edit athlete rows — you can change names, scripts, image URLs, bio, origin
3. To add a new athlete: add a new row with `Status` = `PUBLISHED`
4. To hide an athlete: change `Status` to anything other than `PUBLISHED`
5. Save as CSV (keep the same filename and column headers)
6. Commit and push to GitHub → Vercel redeploys automatically in ~30 seconds

### CSV Column Reference

| Column | What it does |
|---|---|
| `Status` | `PUBLISHED` = shows on page. Anything else = hidden |
| `The Athlete Name` | Name shown on card and player panel |
| `origin` | Shown under name (e.g. "Atlanta, GA - Defender") |
| `Bio` | Short paragraph shown in the player panel |
| `narratorScript` | Text read aloud by the Narrator voice |
| `photographerScript` | Text read aloud by the Photographer voice |
| `portrait` | Image URL **or** a Wix `wix:image://` URI (auto-converted) |
| `Image Alt Text` | Accessibility alt text for the portrait |

---

## One-Time Setup on Vercel

### 1. Push this repo to GitHub
```bash
git init
git add .
git commit -m "Initial deploy"
git remote add origin https://github.com/YOUR_USERNAME/world-at-their-feet.git
git push -u origin main
```

### 2. Connect to Vercel
- Go to vercel.com → New Project → Import your GitHub repo
- Framework: **Other**
- Root directory: leave blank (uses repo root)
- Click Deploy

### 3. Add your ElevenLabs API key
In the Vercel dashboard → your project → **Settings → Environment Variables**

| Name | Value |
|---|---|
| `ELEVENLABS_API_KEY` | your ElevenLabs API key |

Click Save → go to **Deployments** → **Redeploy** to pick up the new variable.

### 4. Done
Your page is live at `https://your-project.vercel.app`

---

## Changing Voice IDs

Open `api/speak.js` and edit the `VOICE_MAP` at the top:

```js
const VOICE_MAP = {
  'Narrator':     'Dslrhjl3ZpzrctukrQSN',
  'Photographer': 'N0Ci88MmvOBNWazIX9VN',
  // 'Miles':     'VOICE_ID_HERE',
};
```

Commit and push — Vercel redeploys automatically.

---

## Local Development

```bash
npm install -g vercel
vercel dev
```

Set your API key locally:
```bash
export ELEVENLABS_API_KEY=your_key_here
vercel dev
```

Open `http://localhost:3000`
