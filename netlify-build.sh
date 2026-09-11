#!/usr/bin/env bash
set -euo pipefail

SHA="${COMMIT_REF:-netlify}"
rm -rf defe-web-build netlify-publish
mkdir -p defe-web-build netlify-publish/el-defe-app
unzip -q defe-web-listo.zip -d defe-web-build

cd defe-web-build
npm install
npm run build -- --base=/el-defe-app/
cd ..

node patch-web-auth.mjs
node patch-brand.mjs
node patch-ui-v5.mjs
node patch-ui-v8.mjs
node patch-ui-v9.mjs
node patch-ui-v11.mjs
node patch-runtime-v19.mjs
node patch-home-v20.mjs
node patch-results-v21.mjs
node patch-fixture-v23.mjs
node patch-laamba-v24.mjs
node patch-laamba-v25.mjs
node patch-argenliga-v26.mjs
node patch-league-logos-v29.mjs
node patch-fefi-senior-v30.mjs
node patch-fefi-senior-v31.mjs
node patch-fefi-senior-v32.mjs
node patch-fefi-senior-v33.mjs
node patch-fefi-senior-v35.mjs
node patch-final-ui-v36.mjs
node patch-store-native.mjs

FEFI="fefi-senior-v35-${SHA}.js"
mv defe-web-build/dist/fefi-senior-v30.js "defe-web-build/dist/${FEFI}"
sed -i "s#fefi-senior-v30.js#${FEFI}#g" defe-web-build/dist/index.html

JS=$(basename "$(ls defe-web-build/dist/assets/index-*.js | head -1)")
UNIQUE="index-v36-${SHA}.js"
cp "defe-web-build/dist/assets/${JS}" "defe-web-build/dist/assets/${UNIQUE}"
sed -i "s#assets/${JS}#assets/${UNIQUE}#" defe-web-build/dist/index.html

cp defe-datos/datos.json defe-web-build/dist/datos.json
if [ -f defe-datos/salud.json ]; then cp defe-datos/salud.json defe-web-build/dist/salud.json; fi

AUTH="web-auth-overlay-${SHA}.js"
BRIDGE="web-comms-push-bridge-${SHA}.js"
COMMS="web-comms-overlay-${SHA}.js"
ACOMP="web-acompanan-overlay-${SHA}.js"
SPONSORSHOME="web-sponsors-home-sync-${SHA}.js"
FOLLOWING="web-following-overlay-${SHA}.js"
MATCHES="matches-explorer-${SHA}.js"
PICKUPHARDENING="store-pickup-hardening-${SHA}.js"
ORDERSAFETY="store-order-safety-${SHA}.js"
STORERECEIVING="store-receiving-${SHA}.js"
STORESTOCKALERTS="store-stock-alerts-${SHA}.js"
STOREROLEVIEW="store-role-view-${SHA}.js"

cp web-auth-overlay.js "defe-web-build/dist/${AUTH}"
cp web-comms-push-bridge.js "defe-web-build/dist/${BRIDGE}"
cp web-comms-overlay.js "defe-web-build/dist/${COMMS}"
cp web-acompanan-overlay.js "defe-web-build/dist/${ACOMP}"
cp web-sponsors-home-sync.js "defe-web-build/dist/${SPONSORSHOME}"
cp web-following-overlay.js "defe-web-build/dist/${FOLLOWING}"
cp app/static/matches-explorer.js "defe-web-build/dist/${MATCHES}"
cp app/static/store-pickup-hardening.js "defe-web-build/dist/${PICKUPHARDENING}"
cp app/static/store-order-safety.js "defe-web-build/dist/${ORDERSAFETY}"
cp app/static/store-receiving.js "defe-web-build/dist/${STORERECEIVING}"
cp app/static/store-stock-alerts.js "defe-web-build/dist/${STORESTOCKALERTS}"
cp app/static/store-role-view.js "defe-web-build/dist/${STOREROLEVIEW}"
cp push-sw.js defe-web-build/dist/push-sw.js
cp manifest.webmanifest defe-web-build/dist/manifest.webmanifest
cp mobile/assets/icon.png defe-web-build/dist/icon.png

# Checkout oficial queda dentro del bundle nativo; no inyectar el interceptor DOM legacy.
sed -i "s#</body>#<script src=\"./${AUTH}\"></script><script src=\"./${BRIDGE}\"></script><script src=\"./${COMMS}\"></script><script src=\"./${MATCHES}\"></script><script src=\"./${ACOMP}\"></script><script src=\"./${SPONSORSHOME}\"></script><script src=\"./${FOLLOWING}\"></script><script src=\"./${PICKUPHARDENING}\"></script><script src=\"./${ORDERSAFETY}\"></script><script src=\"./${STORERECEIVING}\"></script><script src=\"./${STORESTOCKALERTS}\"></script><script src=\"./${STOREROLEVIEW}\"></script></body>#" defe-web-build/dist/index.html

sed -i 's#<script id="vite-plugin-pwa:register-sw" src="/el-defe-app/registerSW.js"></script>##g' defe-web-build/dist/index.html
echo "// inert" > defe-web-build/dist/sw.js
echo "// inert" > defe-web-build/dist/registerSW.js

python3 - "$SHA" <<'PY'
from pathlib import Path
import sys
sha = sys.argv[1]
p = Path('defe-web-build/dist/index.html')
s = p.read_text()
pwa = '<link rel="manifest" href="/el-defe-app/manifest.webmanifest"><link rel="icon" type="image/png" href="/el-defe-app/icon.png"><meta name="theme-color" content="#0b3a7a"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="El Defe">'
clean = f'''<script>(async function(){{var k='defe-clean-{sha}';try{{if(localStorage.getItem(k))return;localStorage.setItem(k,'1');if('serviceWorker' in navigator){{var rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.map(function(r){{return r.unregister()}}));}}if('caches' in window){{var ks=await caches.keys();await Promise.all(ks.map(function(x){{return caches.delete(x)}}));}}}}catch(e){{}}}})();</script>'''
s = s.replace('<head>', '<head>' + clean + pwa, 1)
p.write_text(s)
PY

mkdir -p netlify-publish/el-defe-app
cp -R defe-web-build/dist/. netlify-publish/el-defe-app/
printf '/ /el-defe-app/ 302\n/el-defe-app/* /el-defe-app/index.html 200\n' > netlify-publish/_redirects
cat > netlify-publish/_headers <<'HDR'
/el-defe-app/
  Cache-Control: no-cache, no-store, must-revalidate
/el-defe-app/index.html
  Cache-Control: no-cache, no-store, must-revalidate
/el-defe-app/sw.js
  Cache-Control: no-cache, no-store, must-revalidate
/el-defe-app/registerSW.js
  Cache-Control: no-cache, no-store, must-revalidate
HDR

grep -F "web-acompanan-overlay-${SHA}.js" defe-web-build/dist/index.html
grep -F "web-sponsors-home-sync-${SHA}.js" defe-web-build/dist/index.html
grep -F "web-following-overlay-${SHA}.js" defe-web-build/dist/index.html
grep -F "matches-explorer-${SHA}.js" defe-web-build/dist/index.html
grep -F "Gestionar Sponsors" "defe-web-build/dist/${ACOMP}"
grep -F "/api/sponsors" "defe-web-build/dist/${SPONSORSHOME}"
grep -F "/api/following/next" "defe-web-build/dist/${FOLLOWING}"
grep -F "Cómo llegar" "defe-web-build/dist/${FOLLOWING}"
grep -F "Apertura" "defe-web-build/dist/${MATCHES}"
grep -F "Clausura" "defe-web-build/dist/${MATCHES}"
grep -F "DEFE_FINAL_UI_V36_PROMOS_ARGEN_9NA" "defe-web-build/dist/assets/${JS}"
grep -F "DEFE_STORE_NATIVE_EXACT_V3" "defe-web-build/dist/assets/${JS}"
! grep -F "store-checkout-${SHA}.js" defe-web-build/dist/index.html
! grep -F "web-sponsors-profile-bridge" defe-web-build/dist/index.html
! grep -F "web-push-overlay" defe-web-build/dist/index.html
! grep -F "location.replace" defe-web-build/dist/index.html

echo "Netlify build listo: checkout nativo exacto + Tienda"
