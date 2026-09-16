#!/usr/bin/env bash
set -euo pipefail
SHA="${COMMIT_REF:-netlify}"
SRC="app/static/store-checkout.js"
DST="netlify-publish/el-defe-app/store-checkout-${SHA}.js"
HTML="netlify-publish/el-defe-app/index.html"
cp "$SRC" "$DST"
python3 - "$HTML" "$SHA" <<'PY'
from pathlib import Path
import re, sys
p=Path(sys.argv[1]); sha=sys.argv[2]
s=p.read_text()
# Retirar cualquier interceptor anterior para evitar doble captura del botón de compra.
s=re.sub(r'<script src="\./store-checkout-interceptor-[^"]+\.js"></script>','',s)
# Evitar duplicar versiones anteriores del checkout robusto.
s=re.sub(r'<script src="\./store-checkout-[^"]+\.js"></script>','',s)
tag=f'<script src="./store-checkout-{sha}.js"></script>'
s=s.replace('</body>',tag+'</body>',1)
p.write_text(s)
PY
grep -F "store-checkout-${SHA}.js" "$HTML"
grep -F "DEFE_STORE_CAPTURE_V5" "$DST"
echo "Checkout comprador único V5 integrado"
