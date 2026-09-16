#!/usr/bin/env bash
set -euo pipefail
HTML="netlify-publish/el-defe-app/index.html"
python3 - "$HTML" <<'PY'
from pathlib import Path
import re, sys
p=Path(sys.argv[1])
s=p.read_text()
# El checkout queda exclusivamente en el bundle nativo de React.
# Retiramos cualquier script histórico que capture el botón leyendo el DOM.
s=re.sub(r'<script src="\./store-checkout-interceptor-[^"]+\.js"></script>','',s)
s=re.sub(r'<script src="\./store-checkout-[^"]+\.js"></script>','',s)
p.write_text(s)
PY
# Confirmar que el bundle publicado contiene el checkout nativo actual.
grep -R -F "DEFE_STORE_NATIVE_EXACT_V7" netlify-publish/el-defe-app/assets >/dev/null
echo "Checkout Netlify: solo flujo nativo V7, sin interceptor DOM"
