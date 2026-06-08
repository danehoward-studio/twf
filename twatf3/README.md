# The World at Their Feet
Photography by Ira L. Black · Art Direction by Dane Howard Studio

---

## Deploy to Vercel

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial deploy"
git remote add origin https://github.com/YOUR_USERNAME/world-at-their-feet.git
git push -u origin main
```

### 2. Import into Vercel
- vercel.com → New Project → Import your GitHub repo
- Framework Preset: **Other**
- Root directory: leave blank
- Click Deploy

### 3. Add ElevenLabs API key
Vercel dashboard → your project → **Settings → Environment Variables**
- Name: `ELEVENLABS_API_KEY`
- Value: your key
- Save → Redeploy

---

## Update Athletes (CSV Workflow)

1. Open `data/athletes.csv` in Excel or Google Sheets
2. Edit rows, add athletes, update scripts or images
3. Download as CSV, rename to `athletes.csv`
4. Replace `data/athletes.csv` in this repo
5. Commit and push → Vercel redeploys in ~30 seconds

**To hide an athlete:** change the `Status` column from `PUBLISHED` to anything else.

### CSV Column Reference
| Column | Purpose |
|---|---|
| `Status` | `PUBLISHED` = visible. Anything else = hidden. |
| `The Athlete Name` | Display name |
| `origin` | Shown under name e.g. "Atlanta, GA - Defender" |
| `Bio` | Short paragraph in player panel |
| `narratorScript` | Text spoken by Narrator voice |
| `photographerScript` | Text spoken by Photographer voice |
| `portrait` | Image URL, `/images/filename.jpg`, or Wix URI |
| `Image Alt Text` | Accessibility label for the portrait |

### Adding images
Put portrait JPGs in `public/images/` and reference them in the CSV as `/images/filename.jpg`.

---

## Change Voice IDs
Edit `api/speak.js` — the `VOICE_MAP` at the top:
```js
const VOICE_MAP = {
  'Narrator':     'Dslrhjl3ZpzrctukrQSN',
  'Photographer': 'N0Ci88MmvOBNWazIX9VN',
};
```
Commit and push — done.
