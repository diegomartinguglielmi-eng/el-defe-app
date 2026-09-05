# EL DEFE V9 · Mobile Release Candidate

Esta entrega tiene dos componentes:

1. `app/` + Dockerfile: servidor FastAPI y aplicación web.
2. `mobile/`: aplicación Android Capacitor lista para compilar.

## 1. Publicar el servidor

La opción preparada es Railway.

Crear:
- un servicio desde este proyecto;
- una base PostgreSQL;
- variable `DATABASE_URL` apuntando a PostgreSQL;
- `SECRET_KEY` segura;
- `ADMIN_EMAIL`;
- `ADMIN_PASSWORD`;
- `ALLOWED_ORIGINS=capacitor://localhost,http://localhost,https://localhost`.

Railway usará `Dockerfile` y `railway.json`.

Al finalizar se obtiene una URL HTTPS, por ejemplo:

`https://el-defe-production.up.railway.app`

Comprobar:

`https://.../api/health`

Debe responder `{"ok":true,...}`.

## 2. Conectar Android al servidor

Editar:

`mobile/www/config.js`

y reemplazar:

`https://REEMPLAZAR-CON-URL-REAL`

por la URL HTTPS de Railway.

## 3. Crear Android

Requisitos en una PC:
- Android Studio
- Node.js LTS
- JDK compatible con Android Studio

Windows:
doble clic en `mobile/BUILD_APK_WINDOWS.bat`

Mac/Linux:
`cd mobile && ./BUILD_APK_MAC_LINUX.sh`

Luego Android Studio:
`Build > Build App Bundle(s) / APK(s) > Build APK(s)`

Resultado habitual:
`mobile/android/app/build/outputs/apk/debug/app-debug.apk`

## 4. Instalar en un Android

Copiar `app-debug.apk` al teléfono, abrirlo y autorizar temporalmente
"Instalar apps desconocidas" para la app usada para abrir el archivo.

## 5. Versión pública

Para distribuir profesionalmente:
- crear keystore de firma;
- generar `release.aab`;
- publicar en Google Play Console.

Package Android:
`ar.com.eldefe.app`

Nombre:
`El Defe`

## Estado

La app Android ya está preparada. Lo único que no puede quedar fijo antes del deploy
es la URL HTTPS del backend.
