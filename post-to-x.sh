#!/bin/bash
# Grace of Touch — Daily X Post Generator
# Usage: bash post-to-x.sh
# Reads daily-changelog.json and opens X with pre-filled post

CHANGELOG="C:/tmp/grace-deploy/daily-changelog.json"
DATE=$(date +%Y-%m-%d)

if [ ! -f "$CHANGELOG" ]; then
  echo "No changelog found. Nothing to post."
  exit 0
fi

POSTED=$(cat "$CHANGELOG" | python3 -c "import json,sys;print(json.load(sys.stdin).get('posted',False))" 2>/dev/null)
if [ "$POSTED" = "True" ]; then
  echo "Already posted today."
  exit 0
fi

# Generate post text
TEXT=$(python3 -c "
import json, urllib.parse

with open('$CHANGELOG') as f:
    data = json.load(f)

lines = ['🚀 Grace of Touch — ${DATE} Update', '']
icons = {'new': '✨', 'fix': '🔧', 'update': '📦'}
for c in data['changes']:
    icon = icons.get(c['type'], '•')
    lines.append(f\"{icon} {c['app']}: {c['desc']}\")

lines.append('')
lines.append('🌐 https://grace-of-touch.web.app')
lines.append('#GraceOfTouch #WebApp #Tech')

text = '\n'.join(lines)
print(urllib.parse.quote(text, safe=''))
" 2>/dev/null)

if [ -z "$TEXT" ]; then
  echo "Failed to generate post text."
  exit 1
fi

URL="https://x.com/intent/tweet?text=${TEXT}"
echo "Opening X post in browser..."
echo ""

# Open in default browser
if command -v start &>/dev/null; then
  start "$URL"
elif command -v open &>/dev/null; then
  open "$URL"
else
  echo "Open this URL manually:"
  echo "$URL"
fi

# Mark as posted
python3 -c "
import json
with open('$CHANGELOG') as f:
    data = json.load(f)
data['posted'] = True
with open('$CHANGELOG', 'w') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
" 2>/dev/null

echo "Done. Changelog marked as posted."
