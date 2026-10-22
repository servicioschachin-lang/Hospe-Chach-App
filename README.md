# Hospedaje Ku' Kanche — Sistema de Gestión

Sistema de gestión integral para el **Hospedaje Ku' Kanche** (Guatemala). Es una *Progressive Web App (PWA)* que funciona **100 % offline**: toda la información se guarda en el navegador (IndexedDB) y no requiere conexión a internet ni servidor de base de datos para su operación diaria.

> **Versión actual:** 1.3.9 · Build `2026-08-11_v23`

---

## 🔐 Seguridad — Hash de contraseñas

- **PBKDF2-HMAC-SHA256** (100 000 iteraciones) con sal aleatoria por usuario.
- Las contraseñas **nunca** se almacenan en texto plano en el código fuente ni en la base de datos local.
- El módulo `security.js` expone `hashPassword(plain)` y `verifyPassword(plain, hash)` usando la API nativa `crypto.subtle`.
- Se mantiene compatibilidad con hashes heredados (`sha256$salt$hash`) para importar respaldos antiguos.
- La migración automática de contraseñas en texto plano (`plain:xxx`) se ejecuta al iniciar la app mediante `initializePasswords()`.

---

## 🏗️ Arquitectura (SRP)

La aplicación sigue el principio de **responsabilidad única (SRP)**:

- **`modules/security.js`** — Hash/verificación de contraseñas (Web Crypto API).
- **`modules/db.js`** — Esquema de datos, datos por defecto, migraciones y utilidades de almacenamiento (`saveDB`, `genId`, `logAudit`).
- **`modules/lookup.js`** — Funciones de búsqueda O(1) (`roomById`, `guestById`, `stayById`, `nextResForRoom`) y detección de solapamiento de reservas.
- **`modules/utils.js`** — Formateadores compartidos: `fmtMoney`, `fmtDate`, `statusBadge`, `paginate`, `roundMoney`, `cardFeeParts`.
- **`modules/helpers.js`** — Lógica de negocio: cálculos de precios, validación, resúmenes de auditoría.
- **`modules/room-states.js`** — Motor de cálculo del estado real de una habitación en una fecha.
- **`modules/icons.js`** — Conjunto de íconos SVG `icn()` reemplazando todos los emojis en la UI.
- **Módulos de vista** — Cada pantalla (`rooms.js`, `reservations.js`, `dashboard.js`, `payments.js`, `reception.js`, `reports.js`, etc.) importa utilidades de los módulos anteriores y exporta una única función de renderizado asignada a `window.*` para compatibilidad con `onclick` inline en `index.html`.
- **`modules/config.js`** — Panel de configuración premium con secciones premium, validación y acciones de peligros.
- **`modules/branding.js`** — Logos e identidad personalizables con soporte arrastra-suelta (`drag-over`) y previsualización.
- **`modules/integrity.js`** — Verificación de checksums CRC32 con checksum responsive y exportable.

Los archivos `storageService.js`, `backupService.js`, `syncService.js` y `updateService.js` son scripts sin módulo que se encadenan vía IIFE y adjuntan funciones al objeto `window` global.

## ✨ Características principales

- **Gestión de habitaciones** — Estado en tiempo real (disponible, ocupada, reservada, limpieza, mantenimiento), tarifas, depósito de llaves, capacidad, fotos y descripción.
- **Reservaciones** — Registro de reservas con validación de disponibilidad por fechas (evita solapamientos) y detección de reservas conflictivas.
- **Recepción** — Procesos completos de **check-in** y **check-out**, control de estancias activas.
- **Huéspedes** — Registro y consulta de huéspedes.
- **Servicios adicionales** — Restaurante, lavandería, transporte, tours, minibar, spa, entre otros, con precio por categoría.
- **Caja** — Control de ingresos y egresos, movimientos con tarjeta (comisión configurable, 5 % por defecto), devolución de depósitos de llaves.
- **Tickets de impresión 80 mm** — Generación de comprobantes/tickets térmicos con vista previa e impresión.
- **Housekeeping** — Control de limpieza y reportes de habitaciones.
- **Pendientes y tareas** — Mantenimiento y tareas operativas con recordatorios.
- **Parqueo** — Gestión de cupos de estacionamiento: registro/liberación de vehículos, asignación de cupos y capacidad configurable.
- **Dashboard** — Ocupación, check-ins/check-outs del día, ingresos/egresos, recordatorios y acciones rápidas.
- **Reportes** — Estadísticas operativas.
- **Usuarios y roles** — Administrador, Recepcionista, Housekeeping y Contabilidad, cada uno con menús y permisos propios.
- **Auditoría** — Bitácora de acciones del sistema.
- **Trabajadores** — Registro de empleados y nómina con salario diario, semanal o mensual.
- **Personalización de marca** — Logos e identidad personalizables (logo del sistema y logo para tickets/comprobantes); todo el UI usa solo iconos SVG (`icn()`) sin emojis.
- **Integridad** — Verificación de checksums CRC32 para detectar archivos o datos alterados; checksum responsive con `clamp()` y `word-break:break-all`.
- **Respaldos automáticos** — Descarga automática de respaldo JSON de la base local cada 30 minutos (cuando hay cambios), además de exportación/importación manual.
- **PWA instalable** — Se puede instalar en el escritorio o en dispositivos móviles y usarse sin internet; todos los iconos son SVG mediante `icn()`.
- **Tema claro/oscuro** — Interfaz con modo oscuro por defecto y toggle para alternar al modo claro (ideal para pantallas grandes); ícono `gear` en toggle sin emojis.
- **Actualización automática** — Detecta nuevas versiones/build vía `version.json` y recarga la aplicación aplicando la actualización.
- **Search mejorado** — Buscador de módulos con resultados sólidos (`background:var(--dark1)`), `box-shadow` opaco y navegación por teclado accesible (`aria-label`, `role=listbox`).
- **Toast confiable** — `window.toast` nunca falla: fallback DOM + `safeToast()` en `auth.js` evita `TypeError: window.toast is not a function` al hacer login temprano.

---

## 🚀 Requisitos

No se requieren dependencias ni `npm install`. Solo necesitas un navegador moderno con soporte para ES Modules e IndexedDB:

- Google Chrome / Edge (recomendado)
- Mozilla Firefox
- Safari (macOS / iOS)

> ⚠️ La sincronización en la nube no está activada: la información vive **únicamente en el navegador** de cada equipo. Por eso es importante usar los respaldos JSON.

---

## ▶️ Cómo ejecutar

### Opción 1 — Live Server (recomendado)

El proyecto incluye configuración para el Live Server de VS Code (puerto `5501`):

1. Abre la carpeta `sistema/publicar` en **Visual Studio Code**.
2. Instala la extensión **Live Server**.
3. Haz clic derecho sobre `index.html` → **Open with Live Server**.
4. Ingresa en el navegador: `http://localhost:5501`

### Opción 2 — Abrir directo (`file://`)

Puedes abrir `index.html` directamente en el navegador. La app funciona, pero desactiva automáticamente:
- el registro del *service worker* y las notificaciones de actualización;
- la verificación remota de versión;
- y cualquier solicitud de red (evita errores CORS).

### Opción 3 — Cualquier servidor HTTP estático

Copia/sirve el contenido de esta carpeta en cualquier servidor estático (Nginx, Apache, Python `http.server`, etc.).

---

## 🔐 Usuarios de prueba

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | Administrador |
| `recep` | `recep123` | Recepcionista |
| `house` | `house123` | Housekeeping |
| `caja` | `caja123` | Contabilidad |

---

## 📁 Estructura del proyecto

```
publicar/
├── index.html                # Interfaz principal (login, layout, modales, tickets)
├── app.js                    # Punto de entrada (importa todos los módulos)
├── storageService.js         # Persistencia local en IndexedDB (hotelos_kv) + migración desde localStorage
├── backupService.js          # Respaldos automáticos (descarga JSON cada 30 min)
├── syncService.js            # Stub de sincronización en la nube (deshabilitado)
├── updateService.js          # Detección/aplicación de actualizaciones (version.json)
├── service-worker.js         # PWA: caché offline y actualización del navegador
├── manifest.json             # Manifiesto PWA (instalable en móvil/escritorio)
├── version.json              # Versión y build actual de la aplicación
├── wrangler.jsonc            # Configuración de despliegue en Cloudflare Workers
├── css/                      # Estilos modulares
│   ├── main.css              # Importa el resto de los estilos
│   ├── variables.css         # Variables de diseño (colores, tipografías)
│   ├── base.css              # Estilos base y reset
│   ├── layout.css            # Estructura (login, sidebar, topbar, contenido)
│   ├── components.css        # Botones, tarjetas, tablas, modales, badges…
│   ├── modules.css           # Estilos específicos de cada módulo
│   └── responsive.css        # Adaptaciones para móvil y tablet
├── modules/                  # Módulos ES (cada uno con su vista y lógica)
│   ├── auth.js               # Login, logout, roles y permisos
│   ├── nav.js                # Menú lateral, navegación y navegación inferior móvil
│   ├── db.js                 # Esquema, datos por defecto y migraciones
│   ├── helpers.js / lookup.js / room-states.js / utils.js / ui.js / icons.js
│   ├── dashboard.js          # Panel principal
│   ├── rooms.js              # Habitaciones
│   ├── reservations.js       # Reservaciones
│   ├── reception.js          # Check-in / Check-out (estancias)
│   ├── guests.js             # Huéspedes
│   ├── services.js           # Servicios adicionales
│   ├── payments.js           # Caja (ingresos/egresos, depósitos)
│   ├── receipts.js           # Tickets 80 mm
│   ├── reports.js            # Reportes
│   ├── housekeeping.js       # Limpieza
  │   ├── tasks.js              # Pendientes y mantenimiento
   │   ├── parking.js            # Gestión de cupos de parqueo
   │   ├── users.js              # Gestión de usuarios
│   ├── audit.js              # Bitácora de auditoría
│   ├── workers.js            # Trabajadores y nómina
│   ├── config.js             # Configuración (marca, integridad, respaldos)
│   ├── branding.js           # Logos e identidad
│   ├── integrity.js          # Verificación de checksums
│   ├── photos.js             # Compresión y carga de fotos
│   ├── export.js             # Exportar/importar respaldos JSON
│   └── reminders.js          # Recordatorios y notificaciones
├── logo.png                  # Logo del sistema
├── recibos.jpeg              # Logo para recibos/tickets
├── icon-192.png              # Ícono PWA 192×192
├── icon-512.png              # Ícono PWA 512×512
├── fondo.jpg                 # Fondo/imagen decorativa
└── fuentes.woff              # Fuente local (fallback)
```

---

## 💾 Almacenamiento y datos

La arquitectura de persistencia se divide para optimizar el rendimiento y la integridad de los datos:

- **IndexedDB (`hotelos_kv`):** Es el motor principal donde se gestiona **toda la información operativa** (reservas, huéspedes, habitaciones, finanzas, usuarios). Se utiliza este almacén por su capacidad para manejar grandes volúmenes de datos estructurados de forma asíncrona. Toda la lógica de lectura/escritura reside en `storageService.js`.
- **localStorage:** Se reserva exclusivamente para **configuraciones de usuario** ligeras (nombre del hotel, datos de contacto, preferencias de la UI, logo) que deben estar disponibles instantáneamente al cargar la página.

### Mantenimiento y Debugging
- **Migración:** Al primer arranque, la app **migra automáticamente** cualquier dato previo existente en `localStorage` (claves `hotelos_*`) hacia `IndexedDB`.
- **Inspección técnica:** Puedes visualizar y verificar la integridad de los datos directamente desde el navegador:
  `F12 (DevTools) > pestaña "Application" > IndexedDB > hotelos_kv`.

### Respaldos
1. **Automáticos:** el sistema descarga un archivo `KK_AAAA-MM-DD_HH-MM-SS_backup.json` cada 30 minutos si hubo cambios.
2. **Manuales:** desde **Configuración → Respaldos de Datos (JSON)** puedes:
   - Exportar el respaldo completo.
   - Importar un respaldo desde archivo.
   - Consultar la guía de ayuda.

> 📌 **Importante:** los respaldos son tu única protección de datos. Si se borra la caché o los datos del sitio en el navegador, **se perderá toda la información** a menos que tengas un archivo de respaldo reciente. Se recomienda guardarlos en una carpeta externa (OneDrive, USB, etc.) regularmente.

---

## 🔄 Actualizaciones

El sistema se auto-actualiza mediante el par `version.json` + `service-worker.js`:

1. Al cargar, consulta `version.json` (sin caché).
2. Si el `build` difiere del local, `updateService.js` actualiza el *service worker* y recarga la aplicación forzando la nueva versión.
3. `index.html` carga `app.js?v=<build>` para evitar cachés antiguos.

Para publicar una nueva versión: **incrementa `version` y/o `build`** en `version.json` y re-despliega.

---

## ☁️ Despliegue en Cloudflare (opcional)

El proyecto incluye `wrangler.jsonc` para publicarlo en **Cloudflare Workers** como sitio estático:

```bash
# Con Wrangler instalado globalmente
wrangler deploy

# O con npx
npx wrangler deploy
```

La configuración actual publica el contenido de esta carpeta como estático bajo el nombre `hospedajekukanche` (ajusta el `name` en `wrangler.jsonc` según tu subdominio).

---

## 🛠️ Stack y tecnologías

| Tecnología | Uso |
|---|---|
| HTML5 + CSS3 | Interfaz, diseño responsive y móvil (bottom nav) |
| JavaScript (ES Modules) | Lógica de la aplicación, sin frameworks |
| IndexedDB / localStorage | Persistencia local |
| Service Worker + Cache API | Funcionamiento offline |
| Web App Manifest | Instalación como PWA |
| Cloudflare Workers | Despliegue estático (opcional) |

Sin dependencias externas, sin build system y sin backend.

---

## ⚠️ Consideraciones y limitaciones

- **Sin backend:** los datos son locales por navegador/equipo. El módulo `syncService.js` está deshabilitado (`SYNC_ENABLED = false`).
- Si se usan varios equipos, los datos **no se comparten automáticamente**; usa la exportación/importación JSON para mover datos entre equipos.
- El plan de habitaciones está configurado con **8 habitaciones fijas** (1–8). Si necesitas más u otras, edita las existentes en el módulo de Habitaciones.
- Limpiar los datos del sitio/navegador eliminará la base local: realiza respaldos frecuentes.

---

## 📄 Licencia

Uso interno del Hospedaje Ku' Kanche. No redistribuir sin autorización.