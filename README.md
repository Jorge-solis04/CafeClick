# CaféClick

CaféClick es un proyecto final de Cómputo en la Nube para gestionar pedidos de una cafetería universitaria. El cliente (estudiante) consulta el menú, arma un carrito, confirma el pedido y sigue su preparación. El dueño de la cafetería, desde el panel de cocina, recibe pedidos y actualiza su estado hasta la entrega.

**Estado** · El monorepo tiene la base de Nuxt y Express. El backlog define las funciones pendientes y la guía de despliegue reúne las plantillas de configuración.

## Alcance del MVP

- **Cliente.** Ver productos y precios, editar el carrito, confirmar un pedido y consultar únicamente sus propios pedidos e historial.
- **Dueño de la cafetería (rol cocina).** Ver los pedidos en el panel y avanzar cada uno por `pendiente → preparación → listo → entregado`. Una vez entregado, el pedido queda cerrado a modificaciones.
- **Confirmación.** La API valida cantidades y productos, calcula el total con los precios de PostgreSQL y guarda el precio unitario aplicado a cada producto para conservar el total histórico.
- **Seguimiento en tiempo real.** El servidor envía actualizaciones al navegador mediante Server-Sent Events (SSE). Cocina recibe los nuevos pedidos y el cliente ve los cambios de su pedido sin recargar la página.

## Arquitectura prevista

| Componente | Tecnología y ejecución |
| --- | --- |
| Web (`apps/web/`) | Nuxt 4, Vue 3, TypeScript, Tailwind CSS y Pinia. Sitio estático en Netlify. |
| API (`apps/api/`) | Node.js 22 y Express 5 con TypeScript. Expone operaciones REST para el catálogo y los pedidos, además del canal SSE. Render construye la imagen con `docker/api.Dockerfile`. |
| Datos (`database/`) | PostgreSQL 17 en Render. Migraciones SQL versionadas en `database/migrations/` y datos de demostración en `database/seeds/`. |
| Entorno local | Docker Compose iniciará la web, la API y PostgreSQL. Los dos proyectos comparten un workspace de pnpm y el archivo `pnpm-lock.yaml` en la raíz. |
| Verificación y despliegue | GitHub Actions ejecutará lint, verificación de tipos, pruebas y compilación. Netlify y Render publicarán desde `main`. |

## Flujo de ramas

| Rama | Uso |
| --- | --- |
| `main` | Rama por defecto y de producción. Recibe versiones revisadas desde `develop`. |
| `develop` | Rama de integración. Recibe los cambios de las issues mediante pull requests (PR). |
| `feature/cc-XX-*` | Una rama por issue, creada desde `develop` actualizado. Usa el nombre sugerido en la issue. |

1. Abre un PR de tu rama a `develop`, enlaza la issue y solicita la revisión del otro integrante. Integra cuando esté aprobado y pasen las verificaciones de GitHub Actions.
2. Para liberar, abre un PR de `develop` a `main`. Tras integrarlo, verifica que Netlify y Render publiquen el mismo commit y que la web pública cargue el catálogo desde la API de producción.

## Ejecución local

Usa Node.js 22.22.3 o posterior en la serie 22 y pnpm 12.15.0. También se admite Node.js 24.15.0 o posterior en la serie 24. Desde la raíz instala ambos proyectos con `pnpm install --frozen-lockfile`.

- `pnpm dev` inicia Nuxt en `http://localhost:3000` y Express en `http://localhost:3001` desde una sola terminal. Pulsa `Ctrl+C` para detener ambos.
- `pnpm dev:web` y `pnpm dev:api` permiten iniciar una sola app. Abre la URL de Express para ver su mensaje de arranque.
- `pnpm typecheck`, `pnpm build` y `pnpm test` verifican los tipos, generan los artefactos y ejecutan las pruebas disponibles.

Cuando estén disponibles `compose.yaml` y `.env.example`, sigue la [sección de Docker Compose](CafeClick-guia-de-despliegue.md#2-docker-y-docker-compose) para iniciar el entorno completo con PostgreSQL y cargar el catálogo de demo.

## Entrega académica

| Semana | Demostración prevista |
| --- | --- |
| 1 · Base | Menú y carrito, esquema de pedidos, entorno reproducible con Docker Compose y primer despliegue en Netlify y Render. |
| 2 · Integración | Pedido persistido en PostgreSQL, panel de cocina y seguimiento en tiempo real. Mostrar los PR revisados y las verificaciones de GitHub Actions. |
| 3 · Entrega | Historial, pruebas de integración, despliegue automático desde `main`, documentación y presentación. |

La demo final debe crear un pedido desde la web pública, comprobar que se guardó en PostgreSQL, llevarlo a `entregado` desde cocina y verificar el historial y el total confirmado. La entrega incluye los enlaces públicos, la documentación de arquitectura y API, el backlog, las evidencias de pruebas y los enlaces a PR, revisiones, CI y despliegues.

**Equipo.** Jorge (`Jorge-solis04`) y Fer (`FerGParra02`). Cada quien documentará sus aportes al código, al menos dos PR sustantivos y una revisión técnica. La guía académica plantea equipos de cinco integrantes. Queda por confirmar con el docente cómo aplica ese criterio al equipo actual.

Fuente académica · *Cómputo en la Nube – Proyectos*, pp. 2–5 (requisitos generales), p. 9 (CaféClick) y p. 17 (evaluación).

## Documentación y seguimiento

- [Contrato inicial de la API](docs/api.md)
- [Backlog por semana](docs/backlog.md)
- [Guía de integración y despliegue](CafeClick-guia-de-despliegue.md)
- [Issues de GitHub](https://github.com/Jorge-solis04/CafeClick/issues)
