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

FEFI="fefi-senior-v35-${SHA}.js"
mv defe-web-build/dist/fefi-senior-v30.js "defe-web-build/dist/${FEFI}"
sed -i "s#fefi-senior-v30.js#${FEFI}#g" defe-web-build/dist/index.html

JS=$(basename "$(ls defe-web-build/dist/assets/index-*.js | head -1)")
UNIQUE="index-v35-${SHA}.js"
cp "defe-web-build/dist/assets/${JS}" "defe-web-build/dist/assets/${UNIQUE}"
sed -i "s#assets/${JS}#assets/${UNIQUE}#" defe-web-build/dist/index.html

cp defe-datos/datos.json defe-web-build/dist/datos.json
if [ -f defe-datos/salud.json ]; then cp defe-datos/salud.json defe-web-build/dist/salud.json; fi
AUTH="web-auth-overlay-${SHA}.js"
BRIDGE="web-comms-push-bridge-${SHA}.js"
COMMS="web-comms-overlay-${SHA}.js"
PUSH="web-push-overlay-${SHA}.js"
ACOMP="web-acompanan-overlay-${SHA}.js"
STORECHECKOUT="store-checkout-${SHA}.js"
CHECKOUTMARKER="store-checkout-marker-${SHA}.js"
PICKUPHARDENING="store-pickup-hardening-${SHA}.js"
ORDERSAFETY="store-order-safety-${SHA}.js"
STORERECEIVING="store-receiving-${SHA}.js"
STORESTOCKALERTS="store-stock-alerts-${SHA}.js"
STOREROLEVIEW="store-role-view-${SHA}.js"
STOREUISHIELD="store-ui-shield-${SHA}.js"
cp web-auth-overlay.js "defe-web-build/dist/${AUTH}"
cp web-comms-push-bridge.js "defe-web-build/dist/${BRIDGE}"
cp web-comms-overlay.js "defe-web-build/dist/${COMMS}"
cp web-push-overlay.js "defe-web-build/dist/${PUSH}"
cp web-acompanan-overlay.js "defe-web-build/dist/${ACOMP}"
cp app/static/store-checkout.js "defe-web-build/dist/${STORECHECKOUT}"
cp app/static/store-checkout-marker.js "defe-web-build/dist/${CHECKOUTMARKER}"
cp app/static/store-pickup-hardening.js "defe-web-build/dist/${PICKUPHARDENING}"
cp app/static/store-order-safety.js "defe-web-build/dist/${ORDERSAFETY}"
cp app/static/store-receiving.js "defe-web-build/dist/${STORERECEIVING}"
cp app/static/store-stock-alerts.js "defe-web-build/dist/${STORESTOCKALERTS}"
cp app/static/store-role-view.js "defe-web-build/dist/${STOREROLEVIEW}"
cp app/static/store-ui-shield.js "defe-web-build/dist/${STOREUISHIELD}"
cp push-sw.js defe-web-build/dist/push-sw.js
cp manifest.webmanifest defe-web-build/dist/manifest.webmanifest
cp mobile/assets/icon.png defe-web-build/dist/icon.png
sed -i "s#</body>#<script src=\"./${AUTH}\"></script><script src=\"./${BRIDGE}\"></script><script src=\"./${COMMS}\"></script><script src=\"./${PUSH}\"></script><script src=\"./${ACOMP}\"></script><script src=\"./${STOREUISHIELD}\"></script><script src=\"./${STORECHECKOUT}\"></script><script src=\"./${CHECKOUTMARKER}\"></script><script src=\"./${PICKUPHARDENING}\"></script><script src=\"./${ORDERSAFETY}\"></script><script src=\"./${STORERECEIVING}\"></script><script src=\"./${STORESTOCKALERTS}\"></script><script src=\"./${STOREROLEVIEW}\"></script></body>#" defe-web-build/dist/index.html

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
clean = f'''<script>(async function(){{var k='defe-clean-{sha}';if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,'1');try{{if('serviceWorker' in navigator){{var rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.map(function(r){{return r.unregister()}}));}}if('caches' in window){{var ks=await caches.keys();await Promise.all(ks.map(function(x){{return caches.delete(x)}}));}}}}catch(e){{}}}})();</script>'''
s = s.replace('<head>', '<head>' + clean + pwa, 1)
p.write_text(s)
PY

cp -R defe-web-build/dist/. netlify-publish/el-defe-app/
printf '/ /el-defe-app/ 302\n/el-defe-app/* /el-defe-app/index.html 200\n' > netlify-publish/_redirects

echo "Netlify build listo: netlify-publish/el-defe-app"
