#!/usr/bin/env bash
set -euo pipefail
SHA="${COMMIT_REF:-netlify}"
SRC="web-final-ui-fix.js"
DST="netlify-publish/el-defe-app/web-final-ui-fix-${SHA}.js"
HTML="netlify-publish/el-defe-app/index.html"
cp "$SRC" "$DST"
python3 - "$HTML" "$SHA" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); sha=sys.argv[2]
s=p.read_text()
tag=f'<script src="./web-final-ui-fix-{sha}.js"></script>'
if tag not in s:
    s=s.replace('</body>',tag+'</body>',1)
p.write_text(s)
PY
grep -F "web-final-ui-fix-${SHA}.js" "$HTML"
grep -F "DEFE_FINAL_UI_FIX_20260916_V1" "$DST"
echo "Fix final Competencias cargado después de overlays legacy"
