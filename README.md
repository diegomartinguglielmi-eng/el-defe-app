# EL DEFE · V5

Base de producción para Club Atlético Defensores de Santos Lugares.

## Incluye

- FastAPI + PostgreSQL + SQLAlchemy
- autenticación JWT y roles (admin, delegado, dt, lector)
- auditoría de cambios
- sincronización FEFI mediante cron de Railway cada 4 horas
- bandeja de cambios detectados en FEFI con aprobación/rechazo antes de publicar
- snapshots HTML de cada corrida para trazabilidad y recuperación del parser
- LAAMBA y Argenliga preparados para carga/control manual
- PWA instalable y panel responsive
- base para notificaciones push

## Arquitectura V5

La API web corre en forma continua y PostgreSQL es la fuente única de datos. Un servicio cron independiente consulta FEFI cada cuatro horas y registra las diferencias en una bandeja de pendientes. Los cambios de fixture y sede no se publican hasta que un administrador o delegado los aprueba desde Gestión.

El código de producción vive en este repositorio y los servicios Railway se despliegan desde `main`.
