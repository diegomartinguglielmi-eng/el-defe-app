#!/usr/bin/env bash
set -euo pipefail

# Staging V2: build the React/Vite application directly.
# Do not rebuild the legacy defe-web-listo.zip bundle.
rm -rf netlify-publish
mkdir -p netlify-publish

cd defe-v2
npm install
npm run build
cd ..

cp -R defe-v2/dist/. netlify-publish/

# SPA fallback for React routing.
printf '/* /index.html 200\n' > netlify-publish/_redirects

cat > netlify-publish/_headers <<'HDR'
/
  Cache-Control: no-cache, no-store, must-revalidate
/index.html
  Cache-Control: no-cache, no-store, must-revalidate
HDR

echo "Netlify staging listo: DEFE V2"
