#!/bin/bash
# ─────────────────────────────────────────────────
#  The World at Their Feet — Audio Generator
#  Double-click this file to generate all MP3s.
#
#  ✦ BEFORE RUNNING: paste your ElevenLabs API key
#    on the line below where it says YOUR_KEY_HERE
# ─────────────────────────────────────────────────

ELEVENLABS_API_KEY="sk_b3dd0cf904091c69c487ea78a3e09284f43c32b80e42884d
"

# ── Everything below this line runs automatically ──

# Move to the folder this script lives in
cd "$(dirname "$0")"

echo ""
echo "────────────────────────────────────────────"
echo "  The World at Their Feet · Audio Generator"
echo "────────────────────────────────────────────"
echo ""

# Check API key is set
if [ "$ELEVENLABS_API_KEY" = "YOUR_KEY_HERE" ]; then
  echo "  ✗ ERROR: You need to paste your ElevenLabs API key"
  echo "    Open generate-audio.command in a text editor"
  echo "    and replace YOUR_KEY_HERE with your actual key."
  echo ""
  read -p "  Press Enter to close..."
  exit 1
fi

# Check Node is installed
if ! command -v node &> /dev/null; then
  echo "  ✗ ERROR: Node.js is not installed."
  echo "    Download it at: https://nodejs.org"
  echo "    Install the LTS version, then run this again."
  echo ""
  read -p "  Press Enter to close..."
  exit 1
fi

echo "  Node version: $(node --version)"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "  Installing dependencies..."
  npm install
  echo ""
fi

# Run the generator
ELEVENLABS_API_KEY="$ELEVENLABS_API_KEY" node scripts/generate-audio.js

echo ""
echo "  Done! Now in GitHub Desktop:"
echo "  1. You'll see new files in public/audio/"
echo "  2. Type a commit message and click Commit"
echo "  3. Click Push Origin"
echo ""
read -p "  Press Enter to close this window..."
