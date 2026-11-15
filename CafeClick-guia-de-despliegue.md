# CaféClick · Guía de integración y despliegue

Esta guía acompaña las issues CC-01, CC-04, CC-05, CC-06, CC-11, CC-12 y CC-16. Los ejemplos usan pnpm workspaces, Node 22.22.3 o posterior en la serie 22, PostgreSQL 17, Nuxt estático en Netlify y una API Express en Render. Son plantillas para el repositorio en construcción. Los nombres de scripts y salidas indicados abajo forman parte del contrato de configuración.

## 1. GitHub y GitHub Actions

1. Crear el repositorio con un commit inicial en `main`. Crear `develop` desde `main` y subir ambas ramas.
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

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [develop, main]
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  validate:
    name: Validar proyecto
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_USER: cafeclick
          POSTGRES_PASSWORD: ci-only
          POSTGRES_DB: cafeclick_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U cafeclick -d cafeclick_test"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 10
    env:
      DATABASE_URL: postgresql://cafeclick:ci-only@127.0.0.1:5432/cafeclick_test
      TEST_DATABASE_URL: postgresql://cafeclick:ci-only@127.0.0.1:5432/cafeclick_test
      DATABASE_DIR: ${{ github.workspace }}/database
      NUXT_PUBLIC_API_BASE: http://localhost:3001
      WEB_ORIGIN: http://localhost:3000
      AUTH_SECRET: cafeclick-ci-only-ephemeral-signing-key
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: '22'
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm build
      - run: pnpm --filter @cafeclick/api db:migrate
      - run: pnpm test
      - run: docker build -f docker/api.Dockerfile .
```

La contraseña del ejemplo solo pertenece al PostgreSQL efímero del runner. Si las pruebas de integración necesitan datos, cargarlos como fixtures dentro de las pruebas o con un seed de CI explícito. El comando final comprueba que el Dockerfile de Render compila usando el mismo contexto de raíz.

## 2. Docker y Docker Compose

Usar `process.env.PORT` y escuchar en `0.0.0.0` en Express. La API carga `DATABASE_URL` y `WEB_ORIGIN` por variables de entorno. El navegador local accede a `http://localhost:3001`; el nombre `db` solo se resuelve dentro de la red de Compose.

### `docker/api.Dockerfile`

```dockerfile
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV COREPACK_HOME=/opt/corepack
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
RUN corepack enable && pnpm --version

FROM base AS build
RUN pnpm --filter @cafeclick/api install --frozen-lockfile
COPY apps/api/ apps/api/
RUN pnpm --filter @cafeclick/api build

FROM base AS runtime
ENV NODE_ENV=production
ENV DATABASE_DIR=/app/database
RUN pnpm --filter @cafeclick/api install --prod --frozen-lockfile
COPY --from=build /app/apps/api/dist apps/api/dist
COPY database/ database/
USER node
CMD ["sh", "-c", "pnpm --filter @cafeclick/api db:migrate && exec node apps/api/dist/server.js"]
```

### `docker/web.Dockerfile`

```dockerfile
FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
RUN corepack enable && pnpm --filter @cafeclick/web install --frozen-lockfile
COPY apps/web/ apps/web/
CMD ["pnpm", "--filter", "@cafeclick/web", "dev", "--host", "0.0.0.0"]
```

Si se incorpora `packages/shared`, incluir su manifiesto antes de `pnpm install`, copiar sus fuentes o compilarlo según su contrato y garantizar que exista dentro de la imagen final si la API lo usa en runtime. Agregar a `.dockerignore` al menos `.git`, `.pnpm-store`, `**/node_modules`, `**/.nuxt`, `**/.output`, `**/dist` y `**/.env*`. Evitar que secretos del host entren al contexto.

### `compose.yaml`

El archivo actual inicia solo `db`. Esta plantilla añade `api` y `web` para CC-04.

```yaml
name: cafeclick

services:
  db:
    image: postgres:17
    environment:
      POSTGRES_DB: cafeclick
      POSTGRES_USER: cafeclick
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-local-demo}
    ports:
      - "127.0.0.1:${POSTGRES_PORT:-55432}:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-h", "127.0.0.1", "-U", "cafeclick", "-d", "cafeclick"]
      interval: 3s
      timeout: 3s
      retries: 15

  api:
    build:
      context: .
      dockerfile: docker/api.Dockerfile
    environment:
      PORT: "3001"
      DATABASE_URL: postgresql://cafeclick:${POSTGRES_PASSWORD:-local-demo}@db:5432/cafeclick
      WEB_ORIGIN: http://localhost:3000
      AUTH_SECRET: ${AUTH_SECRET:?Configura AUTH_SECRET en .env}
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "3001:3001"

  web:
    build:
      context: .
      dockerfile: docker/web.Dockerfile
    environment:
      NUXT_PUBLIC_API_BASE: http://localhost:3001
    ports:
      - "3000:3000"

volumes:
  postgres-data:
```

El `DATABASE_URL` de `.env.example` apunta al puerto publicado para migrar desde la terminal. La API de esta plantilla se ejecuta dentro de Compose y se conecta a `db:5432`. Al agregar el servicio `api`, configura también `AUTH_SECRET` en `.env`.

```bash
cp -i .env.example .env
openssl rand -hex 32
# Agrega el valor generado a AUTH_SECRET en .env.
docker compose config --quiet
docker compose up --build -d
docker compose logs api
curl -fsS http://localhost:3001/api/health
docker compose exec api pnpm --filter @cafeclick/api db:seed
curl -fsS http://localhost:3001/api/products
```

Levantar la app desde `http://localhost:3000`. Volver a ejecutar `docker compose up --build -d` para incluir cambios de código en las imágenes. `docker compose down` conserva el volumen. Reservar `docker compose down -v` para reiniciar deliberadamente la base local.

## 3. Render · Express y PostgreSQL

### `render.yaml`

```yaml
services:
  - type: web
    name: cafeclick-api
    runtime: docker
    plan: free
    branch: main
    autoDeployTrigger: commit
    dockerContext: .
    dockerfilePath: ./docker/api.Dockerfile
    healthCheckPath: /api/health
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: cafeclick-db
          property: connectionString
      - key: WEB_ORIGIN
        sync: false
      - key: AUTH_SECRET
        generateValue: true

databases:
  - name: cafeclick-db
    plan: free
    postgresMajorVersion: "17"
```

1. Crear un **Blueprint** conectado al repositorio y seleccionar `main`. Usar nombres únicos si los propuestos ya están ocupados. Introducir el dominio de Netlify en `WEB_ORIGIN`. Para arrancar, se puede usar el nombre de sitio previsto y corregir el valor cuando se confirme la URL.
2. Render construye con el contexto del repositorio y ejecuta el `CMD` del Dockerfile. Express escucha el puerto asignado por Render. La API usa la conexión interna de PostgreSQL creada por el Blueprint, con ambos recursos en la misma región.
3. El comando de arranque aplica migraciones antes de escuchar. El migrador debe registrar qué versiones se aplicaron, tomar un bloqueo para ejecuciones concurrentes y devolver error si falla. Esto permite usar el mismo proceso con Compose y con el plan gratuito. En un plan que permita pre-deploy, se puede trasladar allí la migración y dejar solo el proceso web en el `CMD`.
4. Sembrar el catálogo como operación explícita y repetible. En el plan gratuito, si hace falta desde la máquina local, usar la URL externa de PostgreSQL con credenciales temporales de proyecto y TLS según Render, limitar el acceso externo a la IP que hará la operación cuando sea viable y retirar ese acceso después. Usar solo datos de demo.
5. Verificar `/api/health` y `/api/products` desde la URL pública. El health check devuelve `200` al poder consultar PostgreSQL y `503` si falla. Guardar la URL y el commit del deploy.

Render gratuito puede suspender el servicio web por inactividad y la base gratuita tiene vigencia de 30 días. Comprobar el arranque antes de la presentación y respaldar la base antes de la fecha de expiración. Para un respaldo, ejecutar `pg_dump` con acceso externo temporal y una versión compatible con PostgreSQL 17.

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
