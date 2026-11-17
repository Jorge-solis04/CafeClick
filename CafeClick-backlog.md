# CaféClick · Issues para GitHub

Repositorio: [Jorge-solis04/CafeClick](https://github.com/Jorge-solis04/CafeClick). Base académica: *Cómputo en la Nube – Proyectos*, pp. 2–5, 9 y 17. La guía de despliegue contiene las plantillas de GitHub Actions, Docker, Render y Netlify.

## Reparto

| Responsable | Issues | Trabajo |
|---|---|---|
| Jorge (`Jorge-solis04`) | 9 | Inicialización y ramas, migraciones de PostgreSQL, Docker, GitHub Actions, Render, API de pedidos, checkout en Nuxt, SSE en Express y Nuxt, y liberación. |
| Compañero (`FerGParra02`) | 9 | API inicial y datos de demo, menú y carrito, Netlify, autenticación en Express, panel de cocina, historial, pruebas de PostgreSQL y de la demo, y documentación. |

Ambos trabajan en frontend, backend e infraestructura. Cada uno conserva al menos dos PR sustantivos y evidencia de una revisión técnica. La guía menciona cinco integrantes. Validar con el docente cómo aplica esa parte de la evaluación al equipo.

## Publicación con Codex

1. Usar `Jorge-solis04/CafeClick` como único destino. Buscar cada `CC-xx` en las issues abiertas y cerradas antes de crearla. Si existe, actualizarla conservando su número.
2. Publicar una issue por encabezado `###`, siguiendo el orden del documento. Usar el encabezado como título y copiar los campos y el checklist como cuerpo. Resolver las referencias `CC-xx` de **Depende de** con el número real de la issue correspondiente.
3. Asignar cada issue a la cuenta de GitHub que figura en **Responsable**.
4. Si se usan milestones, agrupar las issues en tres, uno por semana. Al terminar, verificar las 18 issues y las nueve asignaciones de cada integrante. Compartir el enlace al listado y los filtros por responsable.

## Flujo de ramas

- `main` es la rama de producción que requieren Netlify y Render. `develop` concentra la integración. La configuración de ramas se realiza en CC-01.
- Cada issue incluye un nombre de rama sugerido. Crear la rama `feature/cc-XX-…` desde `develop` actualizado cuando se tome la tarea. Abrir PR a `develop`, referenciar la issue y solicitar revisión al otro integrante.
- Abrir PR de `develop` a `main` para liberar. GitHub Actions ejecuta lint, typecheck, pruebas y build. Guardar evidencia del PR y del despliegue en ambos servicios.

## Semana 1 · Base y primer despliegue

**Meta:** el menú y el carrito se pueden demostrar, Compose levanta el entorno completo y hay una primera publicación de Netlify y Render. Los dos pueden avanzar en paralelo con el contrato del catálogo.

### [Semana 1] CC-01 · Inicializar monorepo y flujo de GitHub

- **Responsable** · Jorge (`Jorge-solis04`)
- **Área** · `infra`
- **Depende de** · repositorio creado.
- **Rama sugerida** · `feature/cc-01-inicializar-monorepo-y-flujo-de-github`
- **PR** · Preparar las ramas base. Llevar cambios del monorepo a `develop` mediante PR.

**Criterios de aceptación**

- [ ] Revisar el commit inicial en `main` y confirmar que es la rama por defecto. Crear `develop` desde `main`. Reservar `main` para despliegues.
- [ ] Versionar `pnpm-workspace.yaml`, `pnpm-lock.yaml`, los manifiestos de raíz y de `apps/web` y `apps/api`, y los archivos en `database/migrations`, `database/seeds`, `docker/` y `docs/` conforme se agreguen.
- [ ] Publicar `README.md` inicial y `docs/api.md` con el contrato del catálogo, pedidos y salud. Reservar `docs/backlog.md` para vincular las issues y milestones.
- [ ] Exigir un PR revisado y el check de GitHub Actions en `develop` y `main` cuando el check esté disponible. Documentar el flujo en el README y vincular los PR a sus issues.

### [Semana 1] CC-18 · Crear las migraciones de PostgreSQL

- **Responsable** · Jorge (`Jorge-solis04`)
- **Área** · `backend`
- **Depende de** · CC-01.
- **Rama sugerida** · `feature/cc-18-crear-las-migraciones-de-postgresql`
- **PR** · Desde `develop` hacia `develop`.

**Criterios de aceptación**

- [ ] Agregar migraciones SQL para `users`, `products`, `orders` y `order_items`, incluyendo claves foráneas, cantidades positivas, estados válidos y montos exactos. Incluir el precio unitario en `order_items` para guardar el precio vigente al confirmar el pedido.
- [ ] Ejecutar migraciones de nuevo sobre una base ya inicializada sin perder datos.

### [Semana 1] CC-02 · Publicar la API inicial y los datos de demo

- **Responsable** · Compañero (`FerGParra02`)
- **Área** · `backend`
- **Depende de** · CC-01 y CC-18.
- **Rama sugerida** · `feature/cc-02-publicar-la-api-inicial-y-los-datos-de-demo`
- **PR** · Desde `develop` hacia `develop`.

**Criterios de aceptación**

- [ ] Agregar datos iniciales de catálogo y un seed explícito para cuentas de prueba.
- [ ] Implementar `GET /api/health` con comprobación de PostgreSQL y `GET /api/products` con datos reales y forma de respuesta documentada.

### [Semana 1] CC-03 · Construir el menú y el carrito en Nuxt

- **Responsable** · Compañero (`FerGParra02`)
- **Área** · `frontend`
- **Depende de** · contrato de CC-01. Integrar con CC-02.
- **Rama sugerida** · `feature/cc-03-construir-el-menu-y-el-carrito-en-nuxt`
- **PR** · Desde `develop` hacia `develop`.

**Criterios de aceptación**

- [ ] Configurar Nuxt 4, Vue 3, TypeScript, Tailwind CSS y Pinia. Mostrar menú y precios desde la API.
- [ ] Agregar, quitar y cambiar cantidades desde el carrito. Mostrar subtotal indicativo y estado de carrito vacío.
- [ ] Manejar carga, error y ausencia de productos. Dejar lista la interfaz del carrito para integrar la confirmación en la Semana 2.

### [Semana 1] CC-04 · Levantar web, API y PostgreSQL con Docker Compose

- **Responsable** · Jorge (`Jorge-solis04`)
- **Área** · `infra`
- **Depende de** · esqueletos CC-01, CC-02 y CC-03. Jorge valida API y migraciones.
- **Rama sugerida** · `feature/cc-04-levantar-web-api-y-postgresql-con-docker-compose`
- **PR** · Desde `develop` hacia `develop`.

**Criterios de aceptación**

- [ ] Versionar `compose.yaml`, `docker/web.Dockerfile`, `docker/api.Dockerfile`, `.dockerignore` y `.env.example`.
- [ ] Ejecutar `docker compose up --build` desde un clon limpio con la configuración de ejemplo. Verificar el menú, `/api/health`, el volumen de PostgreSQL y los comandos de migración y seed.
- [ ] Probar que reiniciar el entorno con `docker compose down` conserva los datos y que los servicios pueden iniciarse sin instalar Node localmente.
- [ ] Mantener la compilación de API reproducible desde el contexto de raíz con `docker build -f docker/api.Dockerfile .`. Usar `docker compose config` para validar la configuración y documentar cómo sembrar el catálogo.

### [Semana 1] CC-05 · Configurar CI y publicar API Docker en Render

- **Responsable** · Jorge (`Jorge-solis04`)
- **Área** · `infra`
- **Depende de** · CC-02, Dockerfile de CC-04 y scripts de compilación de CC-03.
- **Rama sugerida** · `feature/cc-05-configurar-ci-y-publicar-api-docker-en-render`
- **PR** · Desde `develop` hacia `develop`.

**Criterios de aceptación**

- [ ] Crear `.github/workflows/ci.yml` con instalación reproducible, lint, typecheck, pruebas y build. Validar al menos un PR con resultados visibles y configurar checks requeridos donde lo permita el repositorio.
- [ ] Versionar `render.yaml`, vincular `main`, desplegar desde `docker/api.Dockerfile` y enlazar PostgreSQL. Ejecutar las migraciones y cargar el catálogo de demo.
- [ ] Verificar públicamente `/api/health` y `/api/products`, y guardar el enlace al primer deploy y al workflow.
- [ ] Ejecutar CI en PR hacia `develop` y `main`, y en cada push a `main`. Render debe desplegar desde `main`, enlazar su PostgreSQL e iniciar Express en `0.0.0.0` con el puerto asignado. La API debe aplicar migraciones antes de escuchar.

### [Semana 1] CC-06 · Publicar el sitio Nuxt en Netlify

- **Responsable** · Compañero (`FerGParra02`)
- **Área** · `infra`
- **Depende de** · CC-03 y URL de CC-05.
- **Rama sugerida** · `feature/cc-06-publicar-el-sitio-nuxt-en-netlify`
- **PR** · Desde `develop` hacia `develop`.

**Criterios de aceptación**

- [ ] Versionar `netlify.toml`, establecer `main` como rama de producción y configurar la URL pública de la API.
- [ ] Desde el sitio publicado, cargar el catálogo de Render. Confirmar CORS desde el dominio público y recarga de una ruta interna.
- [ ] Añadir al README las URLs públicas y documentar cómo reproducir localmente el primer despliegue funcional.
- [ ] Generar Nuxt estático (`ssr: false`) desde el monorepo, publicar `apps/web/.output/public`, configurar `NUXT_PUBLIC_API_BASE` y acordar con Jorge el origen de CORS.

## Semana 2 · MVP integrado

**Meta:** un cliente autenticado crea un pedido persistido. Cocina lo ve, modifica su estado y ambas vistas reciben cambios por SSE. Los PR revisados y el CI dejan evidencia de la integración.

### [Semana 2] CC-07 · Identificar clientes y personal de cocina en la API

- **Responsable** · Compañero (`FerGParra02`)
- **Área** · `backend`
- **Depende de** · CC-02.
- **Rama sugerida** · `feature/cc-07-identificar-clientes-y-personal-de-cocina-en-la-api`
- **PR** · Desde `develop` hacia `develop`.

**Criterios de aceptación**

- [ ] Implementar inicio de sesión para cuentas de prueba con roles cliente y cocina, contraseñas con hash y un token de acceso de vida limitada. Documentar cómo entregar o generar las credenciales de demo.
- [ ] Resolver identidad y rol en Express desde el token. Rechazar sesiones inválidas y acciones de roles no autorizados.
- [ ] Cubrir en pruebas al menos un inicio de sesión válido, uno inválido y una ruta de cocina llamada como cliente.

### [Semana 2] CC-08 · Confirmar pedidos y actualizar estados desde Express

- **Responsable** · Jorge (`Jorge-solis04`)
- **Área** · `backend`
- **Depende de** · CC-02 y CC-07.
- **Rama sugerida** · `feature/cc-08-confirmar-pedidos-y-actualizar-estados-desde-express`
- **PR** · Desde `develop` hacia `develop`.

**Criterios de aceptación**

- [ ] Implementar `POST /api/orders`, `GET /api/orders` y `PATCH /api/orders/:id/status`. El cliente ve solo sus pedidos y cocina recibe los necesarios para su panel.
- [ ] Recalcular el total con precios de PostgreSQL, guardar pedido y renglones en una transacción y rechazar cantidades inválidas o productos inexistentes. El total enviado desde la interfaz carece de autoridad.
- [ ] Restringir la actualización a cocina. Aplicar la secuencia propuesta `pendiente → preparación → listo → entregado` y hacer el avance de forma atómica. Un pedido entregado queda inmutable.

### [Semana 2] CC-09 · Integrar inicio de sesión y confirmación del carrito

- **Responsable** · Jorge (`Jorge-solis04`)
- **Área** · `frontend`
- **Depende de** · CC-03. Integrar con contratos de CC-07 y CC-08.
- **Rama sugerida** · `feature/cc-09-integrar-inicio-de-sesion-y-confirmacion-del-carrito`
- **PR** · Desde `develop` hacia `develop`.

**Criterios de aceptación**

- [ ] Permitir inicio de sesión y guiar a cada rol a su vista. Mostrar errores de credenciales y sesión expirada.
- [ ] Enviar IDs y cantidades. Deshabilitar confirmaciones simultáneas desde la interfaz y conservar el carrito si la solicitud falla.
- [ ] Mostrar confirmación con el folio, el estado y el total devueltos por la API. Vaciar el carrito después de una respuesta exitosa.

### [Semana 2] CC-10 · Construir panel de cocina y vista de pedido del cliente

- **Responsable** · Compañero (`FerGParra02`)
- **Área** · `frontend`
- **Depende de** · CC-07 y CC-08.
- **Rama sugerida** · `feature/cc-10-construir-panel-de-cocina-y-vista-de-pedido-del-cliente`
- **PR** · Desde `develop` hacia `develop`.

**Criterios de aceptación**

- [ ] Mostrar en cocina la lista inicial de pedidos y permitir avanzar al siguiente estado. Mostrar errores y evitar acciones simultáneas sobre el mismo pedido.
- [ ] Mostrar al cliente el estado de su pedido actual y el total confirmado. Distinguir carga, error y listado vacío.
- [ ] Verificar con dos sesiones que cocina puede completar un pedido y el cliente no puede operar el panel ni consultar pedidos ajenos.

### [Semana 2] CC-11 · Emitir eventos SSE de pedidos desde Express

- **Responsable** · Jorge (`Jorge-solis04`)
- **Área** · `backend`, `sse`
- **Depende de** · CC-07 y CC-08.
- **Rama sugerida** · `feature/cc-11-emitir-eventos-sse-de-pedidos-desde-express`
- **PR** · Desde `develop` hacia `develop`.

**Criterios de aceptación**

- [ ] Exponer el stream y su ruta REST de acceso. Vincular cada suscripción a un usuario y rol verificados en el servidor.
- [ ] Tras confirmar la transacción, publicar `order.created` a cocina y `order.status.updated` a cocina y al dueño. El contrato incluye ID, estado, versión y los campos que la vista autorizada necesita.
- [ ] Mantener viva la conexión, retirar suscriptores desconectados y probar en Render el enrutamiento, la expiración y el aislamiento entre dos clientes.
- [ ] Emitir un ticket opaco, de vida corta y de un solo uso desde una ruta REST autenticada. Consumirlo para abrir `EventSource` sin poner el token de sesión en la URL. Publicar cambios después del commit y usar una revisión creciente por pedido.

### [Semana 2] CC-12 · Actualizar el panel y el seguimiento con EventSource

- **Responsable** · Jorge (`Jorge-solis04`)
- **Área** · `frontend`, `sse`
- **Depende de** · CC-10 y CC-11.
- **Rama sugerida** · `feature/cc-12-actualizar-el-panel-y-el-seguimiento-con-eventsource`
- **PR** · Desde `develop` hacia `develop`.

**Criterios de aceptación**

- [ ] Actualizar el store Pinia con los eventos SSE, sin recargar ni sondear la API. Aplicar cada actualización por ID y versión para evitar retrocesos y duplicados.
- [ ] Mostrar un estado de reconexión. Al recuperar la conexión, reconciliar una vez con la API REST y cerrar el stream al salir de la sesión.
- [ ] Demostrar desde Netlify que cocina ve el pedido nuevo y el cliente ve el cambio de estado, con ambas sesiones abiertas y sin recargar.
- [ ] Tras un corte, cerrar la conexión fallida, obtener un ticket nuevo con reintentos espaciados y reconciliar con REST al abrir el stream. Aplicar eventos por revisión en Pinia para no revertir cambios si llegan fuera de orden.

## Semana 3 · Historial, calidad y entrega

**Meta:** desde producción, crear un pedido, entregarlo desde cocina, revisar el historial y comprobar que un merge a `main` actualiza ambos servicios.

### [Semana 3] CC-13 · Agregar historial del cliente

- **Responsable** · Compañero (`FerGParra02`)
- **Área** · `frontend`
- **Depende de** · CC-08, CC-10 y CC-12.
- **Rama sugerida** · `feature/cc-13-agregar-historial-del-cliente`
- **PR** · Desde `develop` hacia `develop`.

**Criterios de aceptación**

- [ ] Mostrar los pedidos propios en orden reciente, con fecha, estado, productos y total confirmado.
- [ ] Verificar que un pedido entregado aparece en el historial y que se puede volver a consultar después de iniciar sesión otra vez.
- [ ] Manejar historial vacío, errores de red y acceso a la vista desde una URL directa publicada.

### [Semana 3] CC-14 · Probar reglas de pedidos y persistencia en PostgreSQL

- **Responsable** · Compañero (`FerGParra02`)
- **Área** · `backend`, `qa-docs`
- **Depende de** · CC-08 y CC-11.
- **Rama sugerida** · `feature/cc-14-probar-reglas-de-pedidos-y-persistencia-en-postgresql`
- **PR** · Desde `develop` hacia `develop`.

**Criterios de aceptación**

- [ ] Ejecutar en CI pruebas de integración con una base aislada y migrada. Cubrir persistencia de pedido y renglones, totales con precios del servidor y conservación de precios históricos.
- [ ] Cubrir listado propio, rechazo de cambios por clientes, secuencia de estados, rechazo de modificación tras entrega y eventos limitados a los suscriptores autorizados.
- [ ] Documentar el contrato final de REST y SSE en `docs/api.md`, con ejemplos y errores esperados.

### [Semana 3] CC-15 · Verificar integración, reconexión y demo

- **Responsable** · Compañero (`FerGParra02`)
- **Área** · `qa-docs`
- **Depende de** · CC-12 y CC-13. Jorge participa con la segunda sesión de prueba.
- **Rama sugerida** · `feature/cc-15-verificar-integracion-reconexion-y-demo`
- **PR** · Desde `develop` hacia `develop`.

**Criterios de aceptación**

- [ ] Repetir el flujo cliente → cocina → historial desde las URLs públicas. Registrar el folio de prueba y contrastar total y estado persistidos mediante una consulta autorizada.
- [ ] Desconectar un cliente durante un cambio de estado, reconectar y verificar que recupera el estado correcto. Comprobar que otra cuenta de cliente queda fuera de ese flujo.
- [ ] Guardar resultados, pasos de reproducción y evidencia del recorrido preparado para la presentación.

### [Semana 3] CC-16 · Validar publicación automática y recuperación

- **Responsable** · Jorge (`Jorge-solis04`)
- **Área** · `infra`
- **Depende de** · CC-05, CC-06 y CC-14. El compañero valida Netlify.
- **Rama sugerida** · `feature/cc-16-validar-publicacion-automatica-y-recuperacion`
- **PR** · Cambios por PR a `develop`. Liberación por PR de `develop` a `main`.

**Criterios de aceptación**

- [ ] Abrir PR de `develop` a `main`, capturar revisión y CI exitoso, hacer merge y comprobar en los dos proveedores que publicaron el mismo commit.
- [ ] Verificar la UI pública, `/api/health`, el catálogo y la conexión a PostgreSQL después del despliegue.
- [ ] Documentar cómo consultar logs, volver a una versión estable y respaldar la base antes de que expire si se usa el plan gratuito.
- [ ] Guardar enlaces a PR, checks de GitHub Actions, deploy de Render y deploy de Netlify. Contrastar el SHA y validar el flujo público con la base desplegada.

### [Semana 3] CC-17 · Cerrar documentación y presentación

- **Responsable** · Compañero (`FerGParra02`)
- **Área** · `qa-docs`
- **Depende de** · CC-15 y CC-16. Ambos aportan evidencias.
- **Rama sugerida** · `feature/cc-17-cerrar-documentacion-y-presentacion`
- **PR** · Desde `develop` hacia `develop`.

**Criterios de aceptación**

- [ ] Completar README, `docs/architecture.md`, `docs/api.md` y `docs/backlog.md` con URLs, arquitectura, instalación, comandos, backlog y evidencias.
- [ ] Preparar presentación y guion. Mostrar Docker local, PR y revisión, CI, deploy desde `main` y flujo del pedido con SSE.
- [ ] Registrar por integrante al menos dos PR sustantivos, una revisión técnica y las contribuciones al código requeridas por la guía.

## Decisiones de implementación

- **Frontend y nube.** Nuxt 4, Vue 3, TypeScript, Tailwind CSS y Pinia. El frontend estático vive en Netlify. Express 5 expone la API REST y el stream SSE desde su contenedor en Render, con PostgreSQL, migraciones versionadas y datos iniciales. Compose levanta los tres servicios en local.
- **Roles y estados.** Se parte de cuentas de demostración. Solo cocina puede avanzar `pendiente → preparación → listo → entregado`. El cliente consulta exclusivamente sus pedidos. El backend calcula el total y un pedido entregado queda inmutable.
- **SSE.** REST sirve para confirmar pedidos, mover estados y obtener una instantánea cuando se abre o recupera la conexión. El stream actualiza las vistas en Pinia con eventos por pedido y revisión, sin sondeo periódico. La demo verifica la recepción en cocina, el seguimiento del dueño y el aislamiento entre clientes.
