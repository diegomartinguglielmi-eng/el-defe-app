#!/usr/bin/env bash
set -e
npm install
npx cap add android
npx capacitor-assets generate --android
npx cap sync android
npx cap open android
