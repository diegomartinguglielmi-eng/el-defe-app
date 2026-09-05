# EL DEFE · V4

Base de producción para Club Atlético Defensores de Santos Lugares.

## Incluye

- FastAPI
- PostgreSQL
- SQLAlchemy
- autenticación JWT
- roles: admin, delegado, dt, lector
- auditoría de cambios
- sincronización automática FEFI / LAAMBA
- importación controlada para Argenliga
- PWA instalable
- service worker
- base para notificaciones
- Docker Compose

## Inicio rápido

```bash
cp .env.example .env
docker compose up --build
```

Abrir:

http://localhost:8000

Usuario administrador inicial:
- email: el valor de `ADMIN_EMAIL`
- clave: el valor de `ADMIN_PASSWORD`

## Roles

- `admin`: acceso total
- `delegado`: carga de partidos/novedades
- `dt`: consulta + gestión futura de plantel/convocados
- `lector`: solo consulta

## Producción

Para ponerlo online se recomienda:
- Render / Railway / Fly.io / Azure / AWS
- PostgreSQL administrado
- HTTPS
- dominio propio
- SECRET_KEY segura
- cambiar contraseña inicial
- configurar backups
- validar legalmente términos de uso y permisos de fuentes externas

## Próximos módulos naturales

- planteles
- convocatorias
- goleadores
- sanciones
- asistencia
- fotos
- push notifications reales con VAPID


# V5 · Módulo deportivo

Se agregan:
- Planteles por competencia / categoría
- Personas: jugadores, DTs y ayudantes
- Asociación jugador-plantel
- Convocatorias por partido
- Asistencia y titularidad
- Estadísticas individuales por partido
- Goles y asistencias
- Tarjetas amarillas / rojas
- Sanciones
- Ranking de jugadores
- Vistas públicas de planteles y estadísticas

Esto permite que la aplicación empiece a funcionar también como herramienta operativa para DTs y delegados.


# V6 · Comunidad

Se agrega:
- perfiles públicos de jugadores
- goleadores y asistidores
- Jugador de la Fecha
- favoritos por usuario
- preferencias de notificaciones
- galería/fotos vinculables a partido o jugador
- vista "Mi Defe"
- capa de comunidad sobre el módulo deportivo V5

El objetivo de V6 es que la app tenga valor diario para familias, jugadores y socios, además del uso operativo de DTs/delegados.


# V7 · Presentación Premium

La V7 mantiene toda la arquitectura funcional de V6 y mejora fuertemente la experiencia pública:

- portada premium
- próximo partido destacado
- calendario semanal
- cards visuales de partidos
- ranking de goleadores
- jugador de la fecha
- perfiles de jugador más trabajados
- navegación optimizada para celular
- sección Mi Defe
- estética lista para presentar institucionalmente

Esta versión está pensada como base visual para demo, validación con el club y posterior despliegue público.
