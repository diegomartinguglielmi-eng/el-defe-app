# Mi DEFE V2 — LAAMBA

Esta rama desarrolla V2 sin modificar la baseline `mi-defe-v1-validada`.

## Modelo funcional

V2 deja de asumir que un jugador pertenece a una sola competencia. La entidad persona/jugador es única y puede tener varias participaciones:

- Baby Fútbol / FEFI / categoría por año
- Futsal / LAAMBA / división
- Futuro: Futsal / Argenliga / división

Una familia puede tener varios hijos y cada hijo puede participar en una o más disciplinas/ligas.

## Fuente LAAMBA 2026

Fuente pública: `https://www.laamba.ar`

Defensores aparece como `Defensores de SL` en Masculino / M-Elite I. La estructura de URLs por división es estable:

`/torneoslaamba/masculino/m-elite-i/{division}/torneo/m-elitei/?db=2026`

Divisiones relevadas inicialmente:
- 1ra
- 3ra
- 4ta
- 5ta
- 6ta
- 7ma
- 8va

Datos publicados y candidatos a sincronización:
- tabla de posiciones
- fixture/resultados por fecha
- local y visitante
- resultado
- dirección/sede
- estadísticas de tabla (Pts, J, GF/GC, DG, G, E, P)
- goleadores/tarjetas como evolución posterior

## Contrato interno propuesto

Cada participación de un jugador debe conservar, como mínimo:

```
person_id
sport          // futbol
discipline     // baby | futsal
competition    // FEFI | LAAMBA | ARGENLIGA
category       // 2013 | 7ma | 1ra ...
season         // 2026
active
```

La UI no debe duplicar personas. Debe permitir cambiar de jugador y, cuando corresponda, de participación/competencia.

## Alcance del primer incremento LAAMBA

1. Mantener intacto todo el flujo FEFI existente.
2. Incorporar catálogo LAAMBA.
3. Permitir asociar LAAMBA como segunda participación de un jugador.
4. Construir sincronizador LAAMBA.
5. Normalizar próximo partido, fixture, último resultado y tabla al mismo modelo que consume Familia.
6. Extender Profesor y Administrador por competencia/categoría.
7. Reutilizar convocatoria, push y respuesta de asistencia.

## Regla de seguridad

No realizar cambios sobre `mi-defe-v1-validada`. Todo desarrollo LAAMBA se realiza en `mi-defe-v2-laamba`.
