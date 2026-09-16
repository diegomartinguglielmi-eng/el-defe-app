#!/usr/bin/env bash
set -euo pipefail
SHA="${COMMIT_REF:-netlify}"
SRC="web-design-polish.js"
DST="netlify-publish/el-defe-app/web-design-polish-${SHA}.js"
HTML="netlify-publish/el-defe-app/index.html"
cp "$SRC" "$DST"
python3 - "$HTML" "$SHA" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); sha=sys.argv[2]
s=p.read_text()
tag=f'<script src="./web-design-polish-{sha}.js"></script>'
if tag not in s:
    s=s.replace('</body>', tag+'</body>', 1)
p.write_text(s)
PY
grep -F "web-design-polish-${SHA}.js" "$HTML"
echo "Polish visual de navegación integrado"
