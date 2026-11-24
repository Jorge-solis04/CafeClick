# CaféClick

CaféClick es un proyecto final de Cómputo en la Nube para gestionar pedidos de una cafetería universitaria. El cliente (estudiante) consulta el menú, arma un carrito, confirma el pedido y sigue su preparación. El dueño de la cafetería, desde el panel de cocina, recibe pedidos y actualiza su estado hasta la entrega.

**Estado** · Nuxt muestra el catálogo de PostgreSQL a través de Express. El repositorio incluye el entorno local con Docker Compose y la configuración de GitHub Actions y Render.

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
| Datos (`database/`) | PostgreSQL 17 con Drizzle ORM sobre `pg`. Las migraciones generadas se versionan en `database/migrations/` y los datos de demostración irán en `database/seeds/`. |
| Entorno local | Docker Compose inicia la web, la API y PostgreSQL. Los dos proyectos comparten un workspace de pnpm y el archivo `pnpm-lock.yaml` en la raíz. |
| Verificación y despliegue | El workflow de GitHub Actions define lint, verificación de tipos, pruebas y compilación. La configuración de Render publica la API desde `main` una vez conectado el repositorio. |

## Flujo de ramas

| Rama | Uso |
| --- | --- |
| `main` | Rama por defecto y de producción. Recibe versiones revisadas desde `develop`. |
| `develop` | Rama de integración. Recibe los cambios de las issues mediante pull requests (PR). |
| `feature/cc-XX-*` | Una rama por issue, creada desde `develop` actualizado. Usa el nombre sugerido en la issue. |

1. Abre un PR de tu rama a `develop`, enlaza la issue y solicita la revisión del otro integrante. Integra cuando esté aprobado y pasen las verificaciones de GitHub Actions.
2. Para liberar, abre un PR de `develop` a `main`. Tras integrarlo, verifica que Netlify y Render publiquen el mismo commit y que la web pública cargue el catálogo desde la API de producción.

## Ejecución local

### Con Docker Compose

Desde la raíz del proyecto, inicia la web, la API y PostgreSQL con la configuración de ejemplo:

```bash
docker compose --env-file .env.example up --build --wait
docker compose --env-file .env.example exec api node dist/database/seed.js
```

Abre el menú en `http://localhost:3000`. Puedes consultar el estado de la API en `http://localhost:3001/api/health`. Las migraciones se aplican al arrancar la API y el catálogo se carga con el segundo comando. Los datos se conservan entre arranques en el volumen de PostgreSQL.

### Con Node.js y pnpm

Usa Node.js 22.22.3 o posterior en la serie 22 y pnpm 12.15.0. También se admite Node.js 24.15.0 o posterior en la serie 24. Desde la raíz instala ambos proyectos con `pnpm install --frozen-lockfile`.

- `pnpm dev` inicia Nuxt en `http://localhost:3000` y Express en `http://localhost:3001` desde una sola terminal. Pulsa `Ctrl+C` para detener ambos.
- `pnpm dev:web` y `pnpm dev:api` permiten iniciar una sola app. Abre la URL de Express para ver su mensaje de arranque.
- `pnpm lint`, `pnpm typecheck`, `pnpm build` y `pnpm test` revisan el código, verifican los tipos, generan los artefactos y ejecutan las pruebas disponibles.

### Web y API en local

La web consulta la API en `/api`. Con `pnpm dev`, Nuxt reenvía esas solicitudes a `http://localhost:3001`, así que en local no hace falta configurar CORS. Para un build publicado, define `NUXT_PUBLIC_API_BASE` con la URL pública de la API antes de generar el sitio.

### PostgreSQL local y migraciones

Desde la raíz, copia `.env.example` a `.env`, inicia PostgreSQL 17 en Docker y aplica el esquema con Drizzle:

```bash
cp -i .env.example .env
docker compose up -d --wait db
pnpm --filter @cafeclick/api build
pnpm --filter @cafeclick/api db:migrate
```

`POSTGRES_PASSWORD` inicializa la contraseña del usuario `cafeclick` y `POSTGRES_PORT` fija el puerto local. `db:migrate` lee `DATABASE_URL` desde el `.env` raíz. Si cambias el puerto o la contraseña, actualiza también la URL. Para un volumen ya inicializado, cambia la contraseña en PostgreSQL antes de actualizar el archivo. `.env` queda ignorado por Git.

Para explorar las tablas en el navegador, ejecuta `pnpm --filter @cafeclick/api db:studio` y abre `https://local.drizzle.studio`. Drizzle Studio usa la misma `DATABASE_URL` del `.env` raíz.

Docker administra el volumen `postgres-data`. `docker compose stop db` detiene PostgreSQL y conserva los datos. Los valores de la plantilla son para desarrollo local. Dentro de Compose, la API usa `db:5432`.

### Datos de demo

Con las migraciones aplicadas, carga el catálogo de demo y, cuando necesites iniciar sesión, las cuentas de prueba:

```bash
pnpm --filter @cafeclick/api db:seed
DEMO_CUSTOMER_PASSWORD='elige-una-contraseña' DEMO_KITCHEN_PASSWORD='elige-otra-contraseña' \
  pnpm --filter @cafeclick/api db:seed:accounts
```

`db:seed` ejecuta en orden los archivos SQL de `database/seeds/` dentro de una transacción. El nombre de cada producto es único en PostgreSQL y el seed omite los que ya existen, por lo que se puede repetir. Si `DATABASE_DIR` está definida, usa `seeds/` dentro de esa ruta.

`db:seed:accounts` crea o actualiza las cuentas `cliente@cafeclick.test` (rol cliente) y `cocina@cafeclick.test` (rol cocina). Las contraseñas no se versionan: se leen de `DEMO_CUSTOMER_PASSWORD` y `DEMO_KITCHEN_PASSWORD`, deben tener entre 8 caracteres y 72 bytes y se guardan con hash bcrypt. `DEMO_CUSTOMER_EMAIL` y `DEMO_KITCHEN_EMAIL` permiten cambiar los correos. Al volver a ejecutarlo, se reemplaza la contraseña de cada cuenta.

Dentro de Docker Compose, el servicio `api` no recibe las contraseñas de demo, así que se pasan al ejecutar el seed:

```bash
docker compose exec api node dist/database/seed.js
docker compose exec -e DEMO_CUSTOMER_PASSWORD='elige-una-contraseña' -e DEMO_KITCHEN_PASSWORD='elige-otra-contraseña' \
  api node dist/database/seed-accounts.js
```

En Render, el contenedor corre los seeds al arrancar, después de las migraciones, porque `render.yaml` define `SEED_ON_START=true`. El catálogo se carga siempre. Las cuentas de demo solo se crean si `DEMO_CUSTOMER_PASSWORD` y `DEMO_KITCHEN_PASSWORD` están definidas en el panel de Render; si faltan, el arranque las omite y lo indica en el log. Como ambos seeds se pueden repetir, cada arranque deja las contraseñas con el valor actual de esas variables: para reiniciar las cuentas, cambia las variables o vuelve a desplegar.

Si prefieres ejecutarlos desde tu máquina, usa la URL externa de PostgreSQL, que exige TLS. Compila antes, porque los seeds usan `dist/`. La variable definida en el comando tiene prioridad sobre el `.env` local:

```bash
pnpm --filter @cafeclick/api build
DATABASE_URL='<url-externa-de-render>?sslmode=require' pnpm --filter @cafeclick/api db:seed
DATABASE_URL='<url-externa-de-render>?sslmode=require' DEMO_CUSTOMER_PASSWORD='...' DEMO_KITCHEN_PASSWORD='...' \
  pnpm --filter @cafeclick/api db:seed:accounts
```

### Credenciales de demo e inicio de sesión

Las contraseñas de demo no se guardan en el repositorio ni en los issues. Quien ejecuta `db:seed:accounts` en un ambiente elige las contraseñas y las comparte con el equipo por un canal privado. Para la presentación, conviene sembrar en Render contraseñas distintas de las locales. Si una contraseña se filtra, basta con volver a ejecutar el seed con otra; la anterior deja de funcionar, aunque las sesiones abiertas siguen vigentes hasta que expiran.

Con las cuentas sembradas, inicia sesión con `POST /api/auth/login`. La respuesta incluye un token que vence en 8 horas y que las rutas privadas reciben en `Authorization: Bearer <token>`:

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"cliente@cafeclick.test","password":"<contraseña-de-demo>"}'
```

### Vistas de cliente y cocina

- `/` muestra el menú y el carrito. Con sesión de cliente, arriba aparece el pedido en curso con un enlace al seguimiento.
- `/pedido` muestra al cliente el estado de su pedido actual, el avance por etapas y el total confirmado. Distingue la carga, el error con opción de reintentar y la cuenta sin pedidos.
- `/cocina` muestra al personal de cocina los pedidos por entregar, del más antiguo al más reciente, con un botón para avanzar cada uno al siguiente estado. El botón se bloquea mientras se guarda el cambio. Si otra pantalla ya avanzó el pedido, la lista se actualiza y la tarjeta explica qué pasó.

Cada vista revisa el rol. Una cuenta de cliente que abre `/cocina` vuelve al menú, y una de cocina que abre `/pedido` vuelve al panel. La API también rechaza con `403` los cambios de estado hechos con una sesión de cliente y solo devuelve a cada cliente sus propios pedidos.

Para verificarlo con dos sesiones, abre la web en una ventana normal con la cuenta de cliente y en una ventana privada con la de cocina. Confirma un pedido como cliente, avánzalo hasta `entregado` desde cocina y comprueba que `/pedido` cambia de etapa sin recargar.

Con PostgreSQL disponible, `pnpm dev:api` lee `DATABASE_URL` del `.env` raíz. `GET /api/health` responde `200` si la API puede consultar PostgreSQL y `GET /api/products` devuelve el catálogo. El [contrato de la API](docs/api.md) describe las respuestas.

Para cambiar el esquema, edita `apps/api/src/database/schema.ts` y ejecuta `pnpm --filter @cafeclick/api db:generate --name describe_change`. Revisa y versiona el SQL y los metadatos que genere Drizzle en `database/migrations/`. `db:migrate` aplica únicamente archivos pendientes. Si `DATABASE_DIR` está definida, usa `migrations/` dentro de esa ruta.

Para comprobar las migraciones, usa la instancia local de Docker. La prueba crea y elimina una base temporal con el usuario de desarrollo:

```bash
TEST_DATABASE_URL='postgresql://cafeclick:local-demo@127.0.0.1:55432/cafeclick' \
  pnpm --filter @cafeclick/api exec tsx --test test/migrations.test.ts test/catalog.test.ts test/auth.test.ts
```

`test/catalog.test.ts` comprueba `/api/health`, `/api/products` y los dos seeds sobre una base temporal. `test/auth.test.ts` comprueba el inicio de sesión, las sesiones expiradas o revocadas y el acceso por rol.

La [guía de despliegue](CafeClick-guia-de-despliegue.md#2-docker-y-docker-compose) incluye la verificación desde un clon limpio, la comprobación del volumen y los pasos para publicar la API en Render.

## Despliegue

| Servicio | URL pública |
| --- | --- |
| Web (Netlify) | [cafeclick.netlify.app](https://cafeclick.netlify.app) |
| API (Render) | [cafeclick-api.onrender.com](https://cafeclick-api.onrender.com) |

### Sitio en Netlify

Netlify genera el sitio estático desde la raíz del monorepo con [`netlify.toml`](netlify.toml): ejecuta `pnpm generate:web` y publica `apps/web/dist`. Nuxt detecta la variable `NETLIFY` del entorno de build y usa el preset `netlify-static`, que escribe en `dist` en lugar de `.output/public`. La rama de producción es `main`. La regla de redirección sirve `index.html` en cualquier ruta, así que recargar una ruta interna abre la app en lugar de un 404 de Netlify.

1. Importa el repositorio en Netlify, deja la raíz como directorio base y elige `main` como rama de producción.
2. En las variables de entorno del sitio, define `NUXT_PUBLIC_API_BASE` con la URL pública de la API, sin barra final: `https://cafeclick-api.onrender.com`. Nuxt la incorpora al generar el sitio, así que si cambia hay que volver a desplegar.
3. En Render, define `WEB_ORIGIN` con la URL del sitio de Netlify, sin barra final. La API solo acepta solicitudes del navegador desde ese origen.
4. Abre el sitio publicado y comprueba que el menú carga los productos de Render. Recarga una ruta interna, por ejemplo `/pedido`, y verifica que responde la app de Nuxt y no la página 404 de Netlify.

Para reproducir el build de Netlify en local, genera el sitio con la URL de la API y sirve la carpeta publicada:

```bash
NETLIFY=true NUXT_PUBLIC_API_BASE='https://cafeclick-api.onrender.com' pnpm generate:web
npx serve apps/web/dist
```

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
