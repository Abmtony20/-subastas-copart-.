# AutoPuja GT: subastas de vehículos en tiempo real (caso Copart)

## 🔗 Sitio publicado: **https://TU-PROYECTO.web.app**

Plataforma web desacoplada (SPA + Web API/BaaS + base de datos) para publicar vehículos importados y subastarlos en tiempo real.

## 👤 Usuarios de prueba (pre-creados)

| # | Nombre | Correo | Contraseña |
|---|--------|--------|------------|
| 1 | Ana López | `ana.prueba@autopuja.test` | `Subasta#2026A` |
| 2 | Bruno Méndez | `bruno.prueba@autopuja.test` | `Subasta#2026B` |
| 3 | Carla Pérez | `carla.prueba@autopuja.test` | `Subasta#2026C` |

**Prueba cruzada sugerida:** abre el sitio en dos navegadores (o uno en modo incógnito), inicia sesión con dos usuarios distintos y entra al mismo vehículo. Al ofertar en uno, el otro ve al instante el nuevo monto, el temporizador y el aviso *"Tu oferta ha sido superada"* sin recargar la página.

## Tecnologías

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + Vite (SPA) y React Router |
| Autenticación | Firebase Authentication (correo/contraseña) |
| Base de datos y tiempo real | Firebase Realtime Database (listeners `onValue`) |
| Validación en servidor | Reglas de seguridad de Realtime Database (`database.rules.json`) |
| Hosting | Firebase Hosting |

## Funcionalidades

- **Autenticación:** registro con nombre, apellido, correo, teléfono y contraseña segura (8+ caracteres, mayúscula, minúscula, número y símbolo). Sin sesión solo se puede ver el inventario; las rutas de publicar y editar redirigen al login, y el servidor rechaza escrituras sin autenticación.
- **Publicación:** ficha técnica completa (año, tipo, marca, modelo, motor, transmisión, combustible, tren de manejo y cilindros), clasificación de daño (🟢 Verde / 🟡 Amarillo / 🔴 Rojo), mínimo 5 fotografías (se comprimen en el navegador), precio base y fechas de inicio y cierre.
- **Mis publicaciones:** buscador y edición de los vehículos propios. Si un vehículo ya tiene ofertas, su precio base y sus fechas quedan bloqueados.
- **Inventario dinámico:** tarjetas con portada, daño, oferta actual y cuenta regresiva en vivo. Filtros combinables por texto, marca, modelo, rango de años, tipo, combustible, transmisión, tracción, cilindros, nivel de daño y estado de la subasta.
- **Detalle y subasta:** carrusel interactivo (flechas, miniaturas y teclado), ficha técnica completa, reloj sincronizado con la hora del servidor, e indicadores *"¡Vas ganando esta subasta!"* y *"Tu oferta ha sido superada"*. Al vencer el tiempo se muestra *Oferta cerrada*, con el resultado *Vendido* o *No vendida / desierta*.
- **Privacidad:** solo se muestra el monto más alto y la cantidad de ofertas; el postor aparece como anónimo. Los perfiles solo los puede leer su propio dueño.

## Reglas de puja validadas en el servidor (`database.rules.json`)

- La oferta debe ser mayor o igual al **precio base**.
- La oferta debe superar la oferta actual por al menos **10%** (`nueva × 10 ≥ actual × 11`).
- Solo se aceptan ofertas entre la **fecha de inicio y la de cierre**, usando la hora del servidor (`now`).
- El postor debe estar autenticado, no puede ser el dueño del vehículo y no puede suplantar a otro usuario.
- Nadie puede borrar ni reducir una puja. El contador de ofertas solo aumenta de uno en uno.

## Estructura de datos

```
users/{uid}/perfil      → nombre, apellido, correo, teléfono (privado)
users/{uid}/pujas/{vid} → subastas en las que participó
vehiculos/{vid}         → ficha técnica, daño, portada, precioBase, inicio, cierre, ownerUid
fotos/{vid}             → galería (≥ 5)
pujas/{vid}             → { monto, lider, ts, total }  (oferta más alta)
```

## Ejecutar localmente

```bash
npm install
# 1. Pegar la configuración web de Firebase en src/firebaseConfig.js
npm run dev
```

## Despliegue

```bash
npx firebase login
npx firebase use --add        # seleccionar el proyecto
npm run deploy                # build + reglas de BD + hosting
npm run seed                  # crea los 3 usuarios de prueba y vehículos demo
```
