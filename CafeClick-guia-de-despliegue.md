# CaféClick · Guía de integración y despliegue

Esta guía acompaña las issues CC-01, CC-04, CC-05, CC-06, CC-11, CC-12 y CC-16. Los ejemplos usan pnpm workspaces, Node 22.22.3 o posterior en la serie 22, PostgreSQL 17, Nuxt estático en Netlify y una API Express en Render. Las secciones siguientes documentan la configuración versionada y los pasos para publicar.

## 1. GitHub y GitHub Actions

1. GitHub Actions ejecuta CI en PR a `develop` y `main`, y en cada push a `main`.
2. Abrir ramas como `feature/cc-03-menu-carrito` desde `develop`. Abrir PR a `develop`, referenciar la issue y pedir revisión al compañero. Liberar con un PR de `develop` a `main`.
3. Una vez que GitHub muestre el check `Validar proyecto`, configurar en **Settings → Rules → Rulesets** o en **Settings → Branches** que ambas ramas requieran PR, una aprobación y ese check. Si el plan del repositorio privado no permite exigirlo, mantener la regla mediante revisión manual y guardar evidencias. Las reglas de GitHub dependen del plan y la visibilidad.
4. Guardar el enlace a los PR, revisiones, corridas de CI y deploys ligados al mismo commit. Con esta configuración, GitHub Actions valida los cambios. Netlify y Render publican por su integración con GitHub.

### Contrato de scripts

| Ubicación | Script | Comportamiento |
|---|---|---|
| Raíz | `lint`, `typecheck`, `test`, `build` | Ejecutan las verificaciones de web y API. El build incluye la generación estática del frontend. |
| Raíz | `generate:web` | Ejecuta `nuxt generate` mediante el workspace web. |
| `apps/web` | `dev`, `generate` | Ejecutan `nuxt dev` y `nuxt generate`. |
| `apps/api` | `build`, `start` | Compilan TypeScript y ejecutan la API compilada en `dist/server.js`. |
| `apps/api` | `db:generate` | Genera SQL y metadatos a partir del esquema de Drizzle. |
| `apps/api` | `db:migrate`, `db:seed` | Ejecutan los scripts compilados usando `DATABASE_URL` y leen los archivos SQL versionados mediante `DATABASE_DIR` o un valor por defecto documentado. |

Publicar `pnpm-lock.yaml` y `pnpm-workspace.yaml` en la raíz. Los dos manifiestos de workspace usados por los Dockerfiles deben existir y coincidir con el lockfile antes de compilar. Corepack usa la versión de pnpm fijada en `package.json`.

### Flujo de validación

El [workflow de CI](.github/workflows/ci.yml) instala pnpm con Corepack y usa el lockfile. Ejecuta lint, verificación de tipos, pruebas y compilación. Las pruebas de catálogo y migraciones crean sus propias bases temporales en el PostgreSQL 17 del runner, usando `TEST_DATABASE_URL`. Los últimos pasos validan Compose y construyen la misma imagen de API que usa Render.

## 2. Docker y Docker Compose

[Compose](compose.yaml) construye la [imagen de API](docker/api.Dockerfile) y la [imagen web](docker/web.Dockerfile) desde la raíz. La API espera a que PostgreSQL acepte conexiones en `db:5432`. Su contenedor aplica las migraciones antes de arrancar Express y pasa la verificación de salud cuando `/api/health` puede consultar PostgreSQL. Nuxt reenvía `/api` a `api:3001` dentro de la red de Compose.

Estos comandos usan [la configuración de ejemplo](.env.example) directamente desde un clon limpio. Solo necesitas Docker con Compose.

```bash
docker compose --env-file .env.example config --quiet
docker compose --env-file .env.example up --build --wait
curl -fsS http://localhost:3001/api/health
docker compose --env-file .env.example exec api node dist/database/migrate.js
docker compose --env-file .env.example exec api node dist/database/seed.js
curl -fsS http://localhost:3000/api/products
```

Abre `http://localhost:3000` y verifica que el menú muestre los productos. Para ver los logs de arranque usa `docker compose --env-file .env.example logs api`. Repite `up --build --wait` al cambiar código para reconstruir las imágenes.

El volumen `postgres-data` conserva el catálogo después de `down`. Para comprobarlo, vuelve a iniciar los servicios y consulta el catálogo sin volver a cargar los datos de demo.

```bash
docker compose --env-file .env.example down
docker compose --env-file .env.example up --wait
curl -fsS http://localhost:3000/api/products
docker build -f docker/api.Dockerfile .
```

Si usas `.env` en local, omite `--env-file .env.example`. Compose pasa `POSTGRES_PASSWORD` a la API por separado de la URL interna. La variable `DATABASE_URL` de la plantilla usa el puerto publicado para los comandos ejecutados desde la terminal del host.

## 3. Render · Express y PostgreSQL

1. Después de liberar la configuración a `main`, crea un **Blueprint** en Render conectado al repositorio de GitHub y selecciona esa rama. Un Blueprint lee [render.yaml](render.yaml) para crear y enlazar la API y PostgreSQL. Introduce el origen previsto de Netlify en `WEB_ORIGIN`, como `https://cafeclick.netlify.app`, y ajústalo cuando se confirme la URL.
2. Render construye el Dockerfile de la API desde la raíz y le pasa la URL interna de PostgreSQL. En los despliegues automáticos, espera a que el CI de `main` pase. El contenedor ejecuta las migraciones y luego Express escucha en `0.0.0.0` con el puerto asignado.
3. Después del primer despliegue, ejecuta el [seed de catálogo para Render](README.md#datos-de-demo) desde tu máquina con la URL externa de PostgreSQL y TLS. Limita el acceso externo a la IP que ejecutará el seed y retíralo al terminar.
4. Verifica `/api/health` y `/api/products` desde la URL pública. Espera una respuesta `200` en ambos casos y un catálogo con productos. Guarda los enlaces al despliegue y al workflow del mismo commit.

Render gratuito puede suspender el servicio web por inactividad y la base gratuita expira tras 30 días. Comprueba el arranque antes de la presentación y respalda la base antes de la fecha de expiración.

## 4. Netlify · Nuxt

Configurar `ssr: false` en `apps/web/nuxt.config.ts` y declarar `runtimeConfig.public.apiBase`. El navegador consume la API de Render. La variable `NUXT_PUBLIC_API_BASE` es pública y queda incorporada al generar el frontend.

### `netlify.toml`

```toml
[build]
  command = "pnpm generate:web"
  publish = "apps/web/.output/public"

[build.environment]
  NODE_VERSION = "22"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

1. Importar el repositorio en Netlify. Configurar `main` como rama de producción y mantener la raíz como base del build para que Netlify detecte `pnpm-lock.yaml` y la versión de pnpm fijada en `package.json`. El ejemplo coloca `netlify.toml` en esa raíz.
2. Definir `NUXT_PUBLIC_API_BASE=https://<servicio>.onrender.com` para el contexto de producción. Generar y desplegar con ese valor. Si la variable cambia, volver a desplegar.
3. Configurar `WEB_ORIGIN=https://<sitio>.netlify.app` en Render, sin barra final. Verificar desde el navegador el catálogo, preflight de REST con `Authorization` y `Content-Type`, recarga de una ruta interna y stream SSE. El ejemplo usa el dominio de producción; si prueban Deploy Previews con API, autorizar sus orígenes explícitamente según el ambiente.
4. Vincular las URLs públicas y guardar evidencia del sitio cargando datos reales. Comprobar en el log de build que Netlify ejecutó el comando de `netlify.toml`.

## 5. SSE · Cliente y cocina en tiempo real

**Contrato propuesto para dominios distintos:** las llamadas REST autenticadas usan el token de sesión en `Authorization: Bearer …`. `EventSource` nativo no admite configurar ese encabezado. Usar un ticket efímero de un solo uso para abrir el stream. Así, el diseño funciona con los dominios predeterminados de Netlify y Render sin depender de cookies entre sitios.

1. `POST /api/orders/events/ticket` valida la sesión y emite un ticket opaco de vida corta, por ejemplo 30 segundos, vinculado a la identidad, el rol, la sesión y la fecha límite de conexión. La API entrega la respuesta con `Cache-Control: no-store`.
2. El navegador crea `EventSource` apuntando a `GET /api/orders/events?ticket=…`. Express consume el ticket atómicamente, inicia la respuesta `text/event-stream` sin caché, envía un comentario periódico para mantener la conexión y retira el suscriptor al cerrarse. Evitar la compresión del stream y filtrar el query del stream en logs bajo control del equipo. El token de sesión nunca se coloca en la URL.
3. Emitir `order.created` a cocina y `order.status.updated` a cocina y al dueño, después del commit en PostgreSQL. Usar una revisión por pedido que aumenta en cada cambio. El store de Pinia fusiona por ID y revisión con la representación autorizada del pedido, sin fetch periódico.
4. Cargar la vista inicial con REST. En la primera conexión y al reconectar, solicitar una instantánea después de abrir el stream y fusionarla con los eventos por revisión. Así un evento nuevo no se pierde si la respuesta REST llega después. Si falla el stream, cerrar ese `EventSource`, solicitar un ticket nuevo con espera incremental y abrir otra conexión. Al cerrar sesión, cerrar el stream; del lado servidor, limitar su vida a la de la sesión y cerrarlo si se revoca la sesión.
5. Empezar con una sola instancia de API. El registro en memoria de tickets y suscriptores tiene ese alcance. Tras un reinicio, la vista se reconcilia mediante REST. Si se escala la API a varias instancias, los tickets, la revocación y la distribución de eventos requieren coordinación compartida.

En producción, probar dos roles y dos clientes distintos. Verificar que la pestaña de cocina recibe un pedido recién confirmado, que el cliente dueño recibe el estado nuevo, que el otro cliente no recibe ese evento y que al reconectar se recupera un estado perdido.

## 6. Verificación y evidencias

| Cuándo | Qué guardar |
|---|---|
| Semana 1 | Primer PR revisado, check de CI, tres servicios iniciados con Compose, URL de Netlify con catálogo y URL de Render con health check. |
| Semana 2 | PRs revisados, ejecución exitosa de CI, pedido persistido y dos pestañas que se actualizan por SSE. |
| Semana 3 | SHA de la entrega visible en GitHub, Netlify y Render, folio de prueba, total e historial correctos, pruebas de integración y evidencia por integrante. |

Si un despliegue falla, revisar primero el build del proveedor y los logs de arranque de Render. Si hay que recuperar la publicación, revertir el PR problemático mediante un PR a `main` y verificar el redeploy de ambos servicios. Un cambio de versión de código no revierte migraciones. Si el fallo afecta el esquema, usar una corrección compatible o recuperar desde el respaldo según el diagnóstico.

## Referencias oficiales

- [GitHub Actions · disparadores](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow) y [protección de ramas](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Docker Compose · servicios y dependencias](https://docs.docker.com/reference/compose-file/services/)
- [Render · Docker](https://render.com/docs/docker), [Blueprints](https://render.com/docs/blueprint-spec), [despliegues](https://render.com/docs/deploys) y [planes gratuitos](https://render.com/docs/free)
- [Netlify · monorepos](https://docs.netlify.com/build/configure-builds/monorepos/) y [rama de producción](https://docs.netlify.com/deploy/deploy-overview/)
- [Nuxt 4 · despliegue estático](https://nuxt.com/docs/4.x/getting-started/deployment)
- [MDN · Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) y [API EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource/EventSource)
