# Contrato inicial de la API

La API de desarrollo escucha en `http://localhost:3001`. La ruta `GET /` responde con `200` y `{"message":"CaféClick API is running"}`. Las rutas de negocio de este documento son el contrato para CC-02, CC-07 y CC-08.

## Rutas

| Método y ruta | Acceso | Respuesta exitosa |
| --- | --- | --- |
| `GET /api/health` | Público | `200` con `{"status":"ok"}` si la API puede consultar PostgreSQL. Si falla la conexión, devuelve `503` con el error `database_unavailable`. |
| `GET /api/products` | Público | `200` con `{"products":[...]}`, ordenados por `id`. Un catálogo vacío devuelve `{"products":[]}`. |
| `POST /api/auth/login` | Público | `200` con `{"token":"...","expiresAt":"...","user":{...}}`. |
| `GET /api/auth/session` | Cliente o cocina | `200` con `{"user":{...}}` de la sesión actual. |
| `POST /api/auth/logout` | Cliente o cocina | `204` y la sesión deja de ser válida. |
| `POST /api/orders` | Cliente | `201` con `{"order":{...}}` y estado inicial `pending`. |
| `GET /api/orders` | Cliente o cocina | `200` con `{"orders":[...]}`. El cliente recibe solo sus pedidos, de más reciente a más antiguo. Cocina recibe los pedidos que aún no se entregan, de más antiguo a más reciente, para atender primero al que lleva más tiempo esperando. |
| `PATCH /api/orders/:id/status` | Cocina | `200` con `{"order":{...}}` después de aplicar la transición. |

Las rutas privadas reciben `Authorization: Bearer <token>`. Los IDs y las cantidades son enteros positivos. Los importes se expresan como cadenas decimales con dos dígitos después del punto, por ejemplo `"42.50"`, para preservar la precisión. Las fechas se envían en formato ISO 8601 y UTC.

## Sesión

Para iniciar sesión, envía el correo y la contraseña de una cuenta de demo. La API compara el correo sin espacios al inicio o al final y sin distinguir mayúsculas.

```json
{ "email": "cliente@cafeclick.test", "password": "<contraseña-de-demo>" }
```

La respuesta incluye el token, su vencimiento y el usuario. El token vence 8 horas después de iniciar sesión. La web lo guarda y lo envía en `Authorization: Bearer <token>`.

```json
{
  "token": "Ws0x1Cq8E3Vd6vY9m2rTqP0kZb4LhGcN7uJfA5sKe1o",
  "expiresAt": "2026-11-21T14:30:00.000Z",
  "user": { "id": 1, "email": "cliente@cafeclick.test", "role": "customer" }
}
```

El rol es `customer` (cliente) o `kitchen` (cocina). `GET /api/auth/session` devuelve el mismo `user` y sirve para comprobar al abrir la web si el token guardado sigue vigente. `POST /api/auth/logout` revoca el token. Las respuestas de sesión llevan `Cache-Control: no-store`.

Si el correo no existe, la contraseña es incorrecta o supera 72 bytes, la API responde `401` con el código `invalid_credentials` y el mensaje "Credenciales inválidas.", sin indicar cuál dato falló. La API guarda solo el hash SHA-256 del token, así que una copia de la base de datos no permite usar las sesiones.

## Catálogo

Cada producto incluye `id`, `name`, `price` y `category`. El precio es una cadena decimal con dos dígitos. La categoría es `drinks` (bebidas) o `food` (comida) y la web la usa para agrupar el menú.

```json
{
  "products": [{ "id": 1, "name": "Café americano", "price": "42.50", "category": "drinks" }]
}
```

El catálogo de demo está en `database/seeds/` y se carga con `db:seed`. El seed solo inserta los productos cuyo nombre todavía no existe, así que puede ejecutarse varias veces sin duplicar datos ni cambiar precios ya guardados.

## Pedidos

Para confirmar un pedido, envía un arreglo de productos y cantidades. La API usa los precios almacenados en PostgreSQL y guarda el precio unitario aplicado a cada renglón.

```json
{
  "items": [{ "productId": 1, "quantity": 2 }]
}
```

Cada producto aparece una sola vez por pedido, con una cantidad entera entre 1 y 50, y un pedido admite hasta 50 productos distintos. Cualquier total, precio u otro campo que envíe la interfaz se ignora. La API recalcula el total y guarda el pedido y sus renglones en una sola transacción, así que un pedido rechazado no deja datos a medias.

La creación y la actualización devuelven el pedido completo. El listado usa la misma representación para cada pedido.

```json
{
  "order": {
    "id": 12,
    "status": "pending",
    "createdAt": "2026-11-14T18:30:00.000Z",
    "total": "85.00",
    "items": [{ "productId": 1, "name": "Café americano", "quantity": 2, "unitPrice": "42.50" }]
  }
}
```

Para avanzar un pedido pendiente, cocina envía `{"status":"preparing"}` a `PATCH /api/orders/12/status`. La API usa `pending → preparing → ready → delivered`. La interfaz los muestra como pendiente, preparación, listo y entregado. Cada solicitud puede avanzar un solo estado. `delivered` es definitivo. El avance es atómico: si dos personas de cocina avanzan el mismo pedido al mismo tiempo, solo una solicitud se aplica y la otra recibe `409`. Las respuestas de pedidos llevan `Cache-Control: no-store`.

## Errores

```json
{
  "error": { "code": "invalid_order", "message": "El pedido debe incluir al menos un producto." }
}
```

| HTTP | Situación |
| --- | --- |
| `400` | Carrito vacío, cantidad inválida o producto repetido (`invalid_order`). Producto inexistente (`unknown_product`). Cuerpo mal formado o estado desconocido (`invalid_request`). |
| `401` | En el login, credenciales inválidas (`invalid_credentials`). En una ruta privada, token ausente (`unauthorized`) o inválido, expirado o revocado (`session_expired`). |
| `403` | La sesión es válida, pero el rol carece de acceso a la operación. El código es `forbidden`. |
| `404` | El pedido solicitado no existe (`order_not_found`). |
| `409` | El cambio de estado no corresponde al siguiente paso o el pedido ya fue entregado (`invalid_transition`). |
| `500` | Error inesperado, por ejemplo si PostgreSQL deja de responder durante una consulta. El código es `internal_error`. |
| `503` | La comprobación de PostgreSQL en `/api/health` falló. El código es `database_unavailable`. |
