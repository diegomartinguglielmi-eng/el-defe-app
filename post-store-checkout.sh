#!/usr/bin/env bash
set -euo pipefail
SHA="${COMMIT_REF:-netlify}"
SRC="store-checkout-interceptor.js"
DST="netlify-publish/el-defe-app/store-checkout-interceptor-${SHA}.js"
HTML="netlify-publish/el-defe-app/index.html"
cp "$SRC" "$DST"
python3 - "$HTML" "$SHA" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); sha=sys.argv[2]
s=p.read_text()
tag=f'<script src="./store-checkout-interceptor-{sha}.js"></script>'
if tag not in s:
    s=s.replace('</body>',tag+'</body>',1)
p.write_text(s)
PY
grep -F "store-checkout-interceptor-${SHA}.js" "$HTML"
grep -F "DEFE_STORE_CAPTURE_V4" "$DST"
echo "Checkout comprador robusto integrado"
