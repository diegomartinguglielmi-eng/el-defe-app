@echo off
echo EL DEFE - Preparando Android
call npm install
call npx cap add android
call npx capacitor-assets generate --android
call npx cap sync android
call npx cap open android
echo.
echo Android Studio se abrira. Use Build ^> Build APK(s).
pause
