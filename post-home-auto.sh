#!/usr/bin/env bash
set -euo pipefail

SHA="${COMMIT_REF:-netlify}"
SRC="web-home-news.js"
DST="netlify-publish/el-defe-app/web-home-news-${SHA}.js"
HTML="netlify-publish/el-defe-app/index.html"

cp "$SRC" "$DST"
python3 - "$HTML" "$SHA" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); sha=sys.argv[2]
s=p.read_text()
tag=f'<script src="./web-home-news-{sha}.js"></script>'
if tag not in s:
    s=s.replace('</body>', tag+'</body>', 1)
p.write_text(s)
PY

grep -F "web-home-news-${SHA}.js" "$HTML"
grep -F "DEFE_HOME_NEWS_AUTO_V3" "$DST"
echo "Novedades automáticas V3 + icono Competencias integrados"
