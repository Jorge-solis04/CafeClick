# AGENTS.md

## Contexto

- CaféClick es el proyecto final de Cómputo en la Nube. El cliente crea y consulta sus pedidos. El dueño de la cafetería usa el rol de cocina para atenderlos.
- La arquitectura prevista usa Nuxt 4 en `apps/web/`, Express 5 en `apps/api/` y PostgreSQL 17 con migraciones en `database/migrations/` y datos de demo en `database/seeds/`. Docker Compose se usa en local. Netlify publica la web y Render despliega la API desde su Dockerfile y aloja PostgreSQL.
- Lee [README.md](README.md) para el alcance general, [el backlog](CafeClick-backlog.md) para criterios de aceptación y [la guía de despliegue](CafeClick-guia-de-despliegue.md) para configuración y comandos. Verifica qué archivos y scripts existen antes de usarlos.

## Reglas del pedido

- La API calcula el total a partir de los precios de PostgreSQL. Al confirmar, guarda el pedido, sus renglones y sus precios unitarios juntos en una transacción, que aplica todos los cambios o ninguno.
- Cada cliente puede consultar solo sus pedidos. Solo cocina puede avanzar `pendiente → preparación → listo → entregado`. Un pedido entregado queda cerrado a modificaciones.
- Los eventos SSE se publican después de guardar los cambios en PostgreSQL y se filtran por usuario y rol. Sigue el contrato de tickets y reconexión de la guía.

## Forma de trabajo

- Parte de la issue `CC-XX` y su alcance. Crea las ramas `feature/cc-XX-*` desde `develop`. Los PR de trabajo apuntan a `develop` y los de liberación van de `develop` a `main`.
- Usa español para explicaciones y documentación del proyecto. Usa inglés para código, nombres nuevos de código, commits y PR. Sigue las convenciones existentes y usa nombres claros en lugar de comentarios en el código.
- Agrega las pruebas que correspondan al cambio. Deja su ejecución al usuario e indica los comandos exactos al entregar una feature. GitHub Actions ejecuta las verificaciones del repositorio.
- Haz commits, pushes y PR solo cuando el usuario lo pida explícitamente. Pide permiso antes de editar `.env`, credenciales, llaves, secretos o archivos fuera del proyecto.
