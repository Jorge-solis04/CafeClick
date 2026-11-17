# Contrato inicial de la API

La API de desarrollo escucha en `http://localhost:3001`. La ruta `GET /` responde con `200` y `{"message":"CaféClick API is running"}`. Las rutas de negocio de este documento son el contrato para CC-02, CC-07 y CC-08.

## Rutas

| Método y ruta | Acceso | Respuesta exitosa |
| --- | --- | --- |
| `GET /api/health` | Público | `200` con `{"status":"ok"}` si la API puede consultar PostgreSQL. Si falla la conexión, devuelve `503` con el error `database_unavailable`. |
| `GET /api/products` | Público | `200` con `{"products":[...]}`, ordenados por `id`. Un catálogo vacío devuelve `{"products":[]}`. |
| `POST /api/orders` | Cliente | `201` con `{"order":{...}}` y estado inicial `pending`. |
| `GET /api/orders` | Cliente o cocina | `200` con `{"orders":[...]}`, de más reciente a más antiguo. El cliente recibe solo sus pedidos. Cocina recibe los pedidos para el panel. |
| `PATCH /api/orders/:id/status` | Cocina | `200` con `{"order":{...}}` después de aplicar la transición. |

Las rutas privadas reciben `Authorization: Bearer <token>`. Los IDs y las cantidades son enteros positivos. Los importes se expresan como cadenas decimales con dos dígitos después del punto, por ejemplo `"42.50"`, para preservar la precisión. Las fechas se envían en formato ISO 8601 y UTC.

## Catálogo

Cada producto incluye solo `id`, `name` y `price`. El precio es una cadena decimal con dos dígitos.

```json
{
  "products": [{ "id": 1, "name": "Café americano", "price": "42.50" }]
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

Para avanzar un pedido pendiente, cocina envía `{"status":"preparing"}` a `PATCH /api/orders/12/status`. La API usa `pending → preparing → ready → delivered`. La interfaz los muestra como pendiente, preparación, listo y entregado. Cada solicitud puede avanzar un solo estado. `delivered` es definitivo.

## Errores

```json
{
  "error": { "code": "invalid_order", "message": "El pedido debe incluir al menos un producto." }
}
```

| HTTP | Situación |
| --- | --- |
| `400` | Cuerpo inválido, carrito vacío, cantidad inválida o producto inexistente. |
| `401` | Token ausente, inválido o expirado en una ruta privada. |
| `403` | La sesión es válida, pero el rol carece de acceso a la operación. |
| `404` | El pedido solicitado no existe. |
| `409` | El cambio de estado no corresponde al siguiente paso o el pedido ya fue entregado. |
| `500` | Error inesperado, por ejemplo si PostgreSQL deja de responder durante una consulta. El código es `internal_error`. |
| `503` | La comprobación de PostgreSQL en `/api/health` falló. El código es `database_unavailable`. |
