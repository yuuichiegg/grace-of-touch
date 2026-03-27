#!/bin/bash
# Grace of Touch — Secure Build Script
# Minifies and obfuscates JS in single-file HTML apps before deploy
# Usage: bash build-secure.sh

set -e

DEPLOY_DIR="C:/tmp/grace-deploy/public"
BUILD_DIR="C:/tmp/grace-deploy/build"

mkdir -p "$BUILD_DIR"

echo "=== GRACE OF TOUCH SECURE BUILD ==="
echo ""

# Function: extract JS from HTML, obfuscate, re-embed
secure_html() {
  local src="$1"
  local filename=$(basename "$src")
  local dest="$BUILD_DIR/$filename"

  echo "Processing: $filename"

  # Copy original as backup
  cp "$src" "$BUILD_DIR/${filename%.html}_dev.html"

  # Extract everything between the last <script> and </script> (inline JS)
  # Use Python for reliable multi-line extraction
  python3 -c "
import re, sys, subprocess, tempfile, os

with open('$src', 'r', encoding='utf-8') as f:
    html = f.read()

# Find all inline script blocks (not src= ones)
pattern = r'(<script(?![^>]*\bsrc=)[^>]*>)(.*?)(</script>)'
matches = list(re.finditer(pattern, html, re.DOTALL))

if not matches:
    print('  No inline scripts found, copying as-is')
    with open('$dest', 'w', encoding='utf-8') as f:
        f.write(html)
    sys.exit(0)

print(f'  Found {len(matches)} inline script block(s)')

result = html
offset = 0

for m in matches:
    js_code = m.group(2).strip()
    if len(js_code) < 100:  # Skip tiny scripts
        continue

    # Write JS to temp file
    tmp_js = tempfile.mktemp(suffix='.js')
    tmp_out = tempfile.mktemp(suffix='.js')

    with open(tmp_js, 'w', encoding='utf-8') as f:
        f.write(js_code)

    # Step 1: Terser (minify + mangle)
    try:
        subprocess.run([
            'terser', tmp_js, '-o', tmp_out,
            '--compress', 'drop_console=false,passes=2',
            '--mangle', '--mangle-props=false',
            '--comments', 'false'
        ], check=True, capture_output=True, timeout=60)
    except Exception as e:
        print(f'  Terser failed: {e}, using original')
        with open('$dest', 'w', encoding='utf-8') as f:
            f.write(html)
        sys.exit(0)

    with open(tmp_out, 'r', encoding='utf-8') as f:
        minified = f.read()

    # Step 2: Obfuscate (light level for performance)
    tmp_obf = tempfile.mktemp(suffix='.js')
    try:
        subprocess.run([
            'javascript-obfuscator', tmp_out, '--output', tmp_obf,
            '--compact', 'true',
            '--control-flow-flattening', 'false',
            '--dead-code-injection', 'false',
            '--string-array', 'true',
            '--string-array-threshold', '0.5',
            '--string-array-encoding', 'base64',
            '--rename-globals', 'false',
            '--self-defending', 'false',
            '--identifier-names-generator', 'hexadecimal',
            '--unicode-escape-sequence', 'false'
        ], check=True, capture_output=True, timeout=120)

        with open(tmp_obf, 'r', encoding='utf-8') as f:
            obfuscated = f.read()

        orig_size = len(js_code)
        new_size = len(obfuscated)
        print(f'  JS: {orig_size:,} -> {new_size:,} bytes ({new_size*100//orig_size}%)')

        # Replace in HTML
        start = m.start(2) + offset
        end = m.end(2) + offset
        result = result[:start] + obfuscated + result[end:]
        offset += len(obfuscated) - len(js_code)

    except Exception as e:
        print(f'  Obfuscation failed: {e}, using minified')
        start = m.start(2) + offset
        end = m.end(2) + offset
        result = result[:start] + minified + result[end:]
        offset += len(minified) - len(js_code)

    # Cleanup temp files
    for f in [tmp_js, tmp_out, tmp_obf]:
        try: os.unlink(f)
        except: pass

with open('$dest', 'w', encoding='utf-8') as f:
    f.write(result)

print(f'  Output: $dest')
"
  echo ""
}

# Process key HTML files
for htmlfile in rocket.html index.html; do
  if [ -f "$DEPLOY_DIR/$htmlfile" ]; then
    secure_html "$DEPLOY_DIR/$htmlfile"
  fi
done

echo "=== BUILD COMPLETE ==="
echo "Dev files: $BUILD_DIR/*_dev.html"
echo "Prod files: $BUILD_DIR/*.html"
echo ""
echo "To deploy: cp $BUILD_DIR/*.html $DEPLOY_DIR/ (excluding *_dev.html)"
