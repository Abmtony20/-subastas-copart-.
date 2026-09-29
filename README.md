# AutoPuja GT: subastas de vehículos en tiempo real (caso Copart)

## 🔗 Sitio publicado: **https://autopuja-acastaneda-cpgcdqf8d5g6cjey.mexicocentral-01.azurewebsites.net**

Sistema desacoplado **Frontend (SPA React) + Web API RESTful (Node.js/Express) + Base de datos (SQL Server / Azure SQL)**, con pujas en tiempo real mediante **Socket.IO** (WebSockets).

## 👤 Usuarios de prueba (pre-creados)

| # | Nombre | Correo | Contraseña |
|---|--------|--------|------------|
| 1 | Ana López | `ana.prueba@autopuja.test` | `Subasta#2026A` |
| 2 | Bruno Méndez | `bruno.prueba@autopuja.test` | `Subasta#2026B` |
| 3 | Carla Pérez | `carla.prueba@autopuja.test` | `Subasta#2026C` |

**Prueba cruzada sugerida:** abre el sitio en dos navegadores distintos (o uno normal y otro en incógnito), inicia sesión con dos usuarios diferentes y entra al mismo vehículo. Por ejemplo, el *2017 Ford Explorer* (base Q 20,000) publicado por Bruno: oferta con Ana y luego con Carla. Cada navegador ve al instante el nuevo monto y los avisos *"¡Vas ganando esta subasta!"* / *"Tu oferta ha sido superada"* sin recargar la página.

## Arquitectura

```
Navegador (React SPA) ──HTTP/JSON──▶ Web API Express ──▶ SQL Server / Azure SQL
        ▲                                  │
        └────────── Socket.IO (WebSocket) ◀┘  (nueva puja → se notifica a todos al instante)
```

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + Vite (SPA), React Router, consumo asíncrono con `fetch` |
| Backend | Node.js + Express 5 (API REST), JWT + bcrypt |
| Tiempo real | Socket.IO (salas por vehículo, mensajes personalizados por usuario) |
| Base de datos | SQL Server (local) / Azure SQL Database (producción) |
| Hosting | Azure App Service (Linux, Node 22) |

Las fotografías de los vehículos de demostración son imágenes con licencia libre de [Wikimedia Commons](https://commons.wikimedia.org) (el nombre de cada archivo está en `server/fotosDemo.js`).

## Endpoints de la API

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/registro` | – | Registro (nombre, apellido, correo, teléfono, contraseña segura) |
| POST | `/api/auth/login` | – | Inicio de sesión, devuelve JWT |
| GET | `/api/auth/yo` | ✔ | Usuario autenticado |
| GET | `/api/catalogos` | – | Catálogos: tipos, transmisiones, combustibles, tracciones, daños y marcas |
| GET | `/api/vehiculos` | – | Inventario con la oferta actual |
| GET | `/api/vehiculos/mios` | ✔ | Mis publicaciones |
| GET | `/api/vehiculos/:id` | opcional | Detalle, fotos y estado personal (ganando / superado) |
| POST | `/api/vehiculos` | ✔ | Publicar vehículo |
| PUT | `/api/vehiculos/:id` | ✔ dueño | Editar publicación |
| POST | `/api/vehiculos/:id/pujas` | ✔ | Ofertar |
| GET | `/api/tiempo` | – | Hora del servidor (sincroniza los temporizadores) |

## Reglas de negocio validadas en el servidor

Todas se validan en `POST /api/vehiculos/:id/pujas`, dentro de una transacción SQL con bloqueo (`UPDLOCK, HOLDLOCK`) para que dos ofertas simultáneas no pasen la misma validación:

- La oferta debe ser mayor o igual al **precio base**.
- La oferta debe superar la oferta actual por al menos **10%**.
- Solo se aceptan ofertas entre la **fecha y hora de inicio y la de cierre**, según el reloj del servidor.
- Hay que haber iniciado sesión, y el publicador no puede ofertar en su propio vehículo.
- **Privacidad:** la API nunca envía la identidad de quien ofertó; solo el monto y la cantidad de ofertas.
- Al cerrar, la subasta queda como **Vendido** si hubo ofertas o como **No vendida / desierta** si no se alcanzó la base.
- Si un vehículo ya tiene ofertas, su dueño no puede cambiar el precio base ni las fechas.

## Modelo de datos

`Usuarios` (1) ─< `Vehiculos` (1) ─< `Fotos`  ·  `Vehiculos` (1) ─< `Pujas` >─ (1) `Usuarios`

El script está en [`server/schema.sql`](server/schema.sql). Las tablas se crean solas al iniciar el servidor.

## Ejecutar localmente

```bash
npm install
cp .env.example .env      # configurar la conexión a SQL Server
npm run build
npm run seed              # tablas + 3 usuarios de prueba + vehículos demo
npm start                 # http://localhost:3000
```

## Pruebas automáticas

Con el servidor corriendo (`npm start`), en otra terminal:

```bash
npm test
```

`tests/pruebas.mjs` ejecuta 42 pruebas de punta a punta que cubren la rúbrica: registro y login (contraseña segura, correo repetido, token falso), bloqueo a anónimos, validaciones de publicación (5+ fotos, ficha completa, daño, tren de manejo, fechas), edición solo por el dueño, reglas de puja (precio base, +10 %, ofertas simultáneas, antes del inicio / después del cierre), anonimato del postor y notificaciones en tiempo real por Socket.IO entre dos usuarios.

> Las subastas de las cuentas de prueba se reabren solas cuando les quedan menos de 12 horas, para que siempre haya vehículos en vivo al evaluar el sitio.

## Despliegue en Azure

1. **Azure SQL Database:** crea un servidor y una base de datos `SubastasCopart` (la oferta *Free* sirve). En *Redes*, activa **"Permitir que los servicios de Azure accedan"** y agrega tu IP.
2. **Azure App Service:** crea una *Web App* con Linux y **Node 22 LTS**. En *Configuración*:
   - Variables de entorno: `DB_SERVER`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` y `JWT_SECRET`.
   - En *Configuración general*: **Web sockets = Activado**.
   - Comando de inicio: `npm start`.
3. **Deployment Center:** conecta este repositorio de GitHub. Azure genera el workflow de GitHub Actions, que instala, compila y publica.
4. **Datos de prueba:** no hay que hacer nada. Al iniciar, si la base de datos está vacía, el servidor crea solo los 3 usuarios de prueba y los vehículos de demostración (`server/seed.js`).
