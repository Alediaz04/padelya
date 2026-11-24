# 🎾 PadelYa — Plataforma de Reserva de Canchas y Gestión Integral de Clubes

**PadelYa** es una aplicación web completa para la reserva de turnos de pádel en tiempo real y la administración operativa y financiera de complejos deportivos, desarrollada de forma incremental a lo largo de **3 Sprints** aplicando metodologías ágiles (Scrum), diseño centrado en la experiencia de usuario (inspirado en *ATC Sports*) y persistencia en la nube con **Firebase Cloud Firestore**.

---

## 🚀 Resumen de lo desarrollado por Sprint

### 🟢 Sprint 1 — Flujo Principal del Jugador y Prevención de Duplicados
- **Registro e Inicio de Sesión de Jugadores (`registro.html`, `login.html`):**
  - Creación de cuenta con nombre, email único, **teléfono / WhatsApp de contacto** y contraseña validada (mínimo 6 caracteres).
  - Control de sesión activa y protección de rutas internas (`protegerPagina()`).
- **Catálogo de Canchas Activas (`canchas.html`):**
  - Visualización de canchas disponibles diferenciando tipo (**Techada** vs. **Descubierta**), especificaciones técnicas (*Blindex*, *Césped sintético*, *Iluminación LED*) y tarifas por turno (`$25.000` Techada / `$20.000` Descubierta).
- **Disponibilidad en Tiempo Real y Reserva Multiturno (`disponibilidad.html`, `reserva-confirmada.html`):**
  - Carrusel interactivo de los próximos 7 días (`HOY`, `MAÑ`, etc.) + selector de calendario.
  - Selección de **1, 2, 3 o hasta 4 turnos consecutivos** en el mismo día (con cálculo automático del total a abonar).
  - **Validación anti-duplicados:** impide la superposición de reservas confirmadas en una misma cancha, fecha y bloque horario, ofreciendo horarios alternativos libres en caso de conflicto.

---

### 🔵 Sprint 2 — Gestión de Reservas, Panel de Canchas, Firebase y Seguridad
- **Mis Reservas y Cancelación de Turnos (`mis-reservas.html`):**
  - El jugador visualiza sus **Próximos turnos confirmados** separados de su **Historial** (turnos finalizados o cancelados).
  - Cancelación con confirmación en dos pasos: si el jugador no puede asistir, cancela su reserva y el bloque horario vuelve a quedar **Libre** automáticamente en la grilla de disponibilidad.
- **Panel Administrativo de Canchas y Turnos (`admin.html`):**
  - Acceso exclusivo protegido por rol (`protegerPaginaAdmin()`) para la cuenta administradora.
  - **Gestión de Reservas del Día:** filtro por fecha, cancha y estado, indicadores KPI del día, contacto directo con el jugador vía **WhatsApp** (`wa.me`), cancelación/baja y carga manual de reservas de mostrador.
  - **Feriados, Domingos Medio Tiempo y Bloqueos:** configuración del horario habitual por día de la semana (ej. domingos en horario reducido de `09:00 a 14:00 hs`), cierre de día completo por feriado o bloqueo de franjas horarias por mantenimiento/torneos.
  - **CRUD Completo de Canchas:** creación de nuevas canchas, agregación dinámica de nuevos tipos de cancha, edición de nombre, tipo, precio por hora y características técnicas, activación/pausa y eliminación.
- **Integración con Firebase Cloud Firestore (`js/firebase-config.js`, `js/datos.js`):**
  - Sincronización en tiempo real (`onSnapshot`) de las colecciones `usuarios`, `canchas`, `reservas`, `bloqueos`, `gastos` y `configuracion` en el proyecto `padelya-d7894`.
- **Seguridad Criptográfica (`js/utils.js`, `js/auth.js`):**
  - Encriptación irreversible de contraseñas mediante **SHA-256 con salt** (`crypto.subtle.digest`) para que ninguna contraseña se almacene ni exponga en texto plano en Firestore (`passwordHash`).

---

### 🟣 Sprint 3 — Panel Exclusivo de Finanzas, Registro de Gastos y Balance Contable
- **Selector de Módulos Administrativos (Panel Canchas vs. Panel Finanzas):**
  - Botón desplegable en la barra superior (`🏟️ Panel Canchas ▾` / `💼 Panel Finanzas ▾`) y selector rápido en la cabecera administrativa para alternar entre la operación de canchas (`admin.html`) y la administración financiera (`finanzas.html`).
- **Panel de Finanzas y Balance en Tiempo Real (`finanzas.html`, `js/finanzas.js`, `js/pantallas/finanzas.js`):**
  - **Filtros por Período:** consulta instantánea por *Hoy*, *Últimos 7 días*, *Este Mes*, *Este Año*, *Histórico Completo* o rango de fechas personalizado (*Desde / Hasta*).
  - **Indicadores Financieros (KPIs):**
    1. **Ingresos por Reservas:** suma automática de todas las reservas confirmadas en el período y total de horas vendidas.
    2. **Gastos Registrados:** total de egresos cargados en el período.
    3. **Ganancia Neta (`Ingresos - Gastos`):** descuento automático de los gastos sobre los ingresos brutos, indicando visualmente si el complejo se encuentra en *Superávit* o *Déficit*.
    4. **Rentabilidad sobre Ingresos (%):** margen operativo y barra visual de proporción ingresos vs. gastos.
- **Registro y Categorización Descriptiva de Gastos:**
  - Alta, edición y eliminación de gastos del complejo (con sincronización directa a la colección `gastos` en Firestore).
  - Categorías descriptivas predefinidas con iconografía y color (*💡 Servicios*, *🎾 Insumos & Pelotas*, *🛠️ Mantenimiento de Canchas*, *👥 Personal & Recepción*, *🥤 Buffet & Bebidas*, *🏛️ Impuestos & Tasas*, *📌 Otros*) + botón **`➕ Agregar categoría descriptiva`** para crear categorías personalizadas.
  - Registro de concepto detallado, fecha, monto en pesos, medio de pago (*Efectivo / Caja*, *Transferencia*, *Tarjeta*) y número de comprobante/factura.
- **Gráficos Analíticos y Exportación Contable:**
  - Gráfico de barras de **Distribución de gastos por categoría** y gráfico de **Ingresos generados por cancha**.
  - Vista dual: **📋 Gastos Registrados** (con filtro por categoría y buscador en vivo) y **🔄 Flujo de Caja Completo** (movimientos cronológicos de ingresos y egresos).
  - **Exportación a Excel / CSV (`📥 Exportar Excel / CSV`)** con codificación UTF-8 BOM y **Reporte Imprimible (`🖨️ Imprimir Balance`)**.

---

## 🗂️ Estructura del Proyecto

```text
padelya-sprint1/
├── index.html                # Landing page principal
├── registro.html             # Registro de jugadores (con teléfono y hash SHA-256)
├── login.html                # Inicio de sesión (redirige según rol: jugador o admin)
├── canchas.html              # Catálogo de canchas activas con precios y características
├── disponibilidad.html       # Grilla de horarios, tira de 7 días y reserva de 1 a 4 turnos
├── reserva-confirmada.html   # Comprobante de reserva confirmada
├── mis-reservas.html         # Próximos turnos del jugador, historial y cancelación
├── admin.html                # Módulo Administrativo 1: Panel de Canchas, Reservas y Bloqueos
├── finanzas.html             # Módulo Administrativo 2: Panel de Finanzas, Gastos y Balance
├── vercel.json               # Configuración lista para despliegue en Vercel
├── css/
│   └── estilos.css           # Sistema de diseño UX/UI completo + soporte de impresión
└── js/
    ├── firebase-config.js    # Credenciales y conexión a Firebase Cloud Firestore
    ├── datos.js              # Capa de persistencia (Firestore + sincronización localStorage)
    ├── utils.js              # Fechas, precios, hashing SHA-256, barra con selector de paneles y pie
    ├── auth.js               # Autenticación, sesiones y control de acceso por rol
    ├── canchas.js            # Lógica y CRUD de canchas y precios
    ├── reservas.js           # Disponibilidad, reservas multiturno, cancelaciones y bloqueos
    ├── finanzas.js           # Lógica de gastos por categoría, ingresos y balance neto
    └── pantallas/            # Controladores de interfaz de cada pantalla
        ├── inicio.js
        ├── registro.js
        ├── login.js
        ├── canchas.js
        ├── disponibilidad.js
        ├── confirmacion.js
        ├── mis-reservas.js
        ├── admin.js
        └── finanzas.js
```

---

## 🔐 Credenciales de Acceso

| Rol | Email | Contraseña | Acceso principal |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@padelya.com` | `admin123` | Redirige a `admin.html` y habilita el selector **Panel Canchas / Panel Finanzas** |
| **Jugador** | `jugador@padelya.com` | `123456` | Redirige a `canchas.html` y `mis-reservas.html` |

---

## 🌐 Despliegue en Vercel

1. Subir los cambios al repositorio de GitHub (`Alediaz04/padelya`).
2. En [Vercel](https://vercel.com), importar el repositorio `padelya`.
3. En **Root Directory**, seleccionar la carpeta `padelya-sprint1` (donde se encuentra `index.html` y `vercel.json`).
4. Hacer clic en **Deploy**.
