# Manual de Usuario y Guía Operativa Integral (Versión Completa Actualizada)
## Escuela Profesional D' Belleza (EPB) — Suite Académica, Biométrica y Terminal POS

> **Nota:** Este manual documenta de forma completa y actualizada todos los módulos, flujos operativos y reglas financieras en **Pesos Colombianos (COP)** de la plataforma de **Escuela Profesional D' Belleza (EPB)**, incluyendo las últimas mejoras de interfaz POS, operación con un solo PC compartido en ventas, impresión térmica de 80mm sin desperdicio de papel, arqueo por fechas y despliegue optimizado en **Railway**.

---

## 1. Arquitectura General, Menú Auto-Dock y Esquema Híbrido (Huella + PIN)

### 1.1. Esquema Híbrido: Huella en Recepción + PIN / Código en Ventas
- **En Recepción (`/asistencia` y `/alumnos`):** Se utiliza el lector biométrico USB conectado en la entrada para enrolar alumnas y validar su asistencia diaria.
- **En el PC de Ventas POS (`/ventas`) y Equipos sin Huellero:** Los funcionarios ingresan con su **`PIN / Código de Acceso` (`accessCode`)** creado en `/usuarios` (ej. `ADMIN-01`, `LAURA-01`).
- **Acceso Directivo Silencioso (Llave Maestra de Contingencia):** En la pantalla de acceso existe la opción discreta **`¿El huellero USB está dañado o desconectado? • Protocolo de Contingencia`**. Al abrirla, muestra una ventana limpia y silenciosa (sin banners rojos ni avisos de cámara en pantalla) donde Dirección puede ingresar la **Llave Maestra** para desbloquear cualquier rol de forma inmediata.

### 1.2. Nuevo Menú Lateral "Auto-Dock Inteligente" (`src/components/layout/Sidebar.tsx`)
- **Modo Auto-Dock por defecto (`64px`):** El menú izquierdo permanece recogido en una barra delgada de íconos para darle casi el **100% del ancho de pantalla** a la Terminal POS, las Agendas y el Dashboard.
- **Despliegue automático al acercar el mouse (`Hover`):** Apenas acercas el cursor al borde izquierdo, el menú se desliza suavemente mostrando los nombres de todos los módulos autorizados para tu rol, y al retirar el cursor se guarda solo sin hacer saltar el contenido.
- **Botón `Fijar` (`📌 Pin`):** Si en algún computador prefieren dejar el menú abierto permanentemente (`224px`), basta con tocar el ícono de **Pin** en la esquina superior derecha del menú (o el botón `Fijar` en la base del menú). La preferencia queda guardada en el navegador.

### 1.3. Barra Superior Limpia y Sincronización de Bajo Consumo (`src/components/layout/Header.tsx`)
1. **Interruptor `Modo Escritorio` ↔ `MODO TÁCTIL POS`:** Agranda áreas táctiles, fuentes (`17.5px`) y activa números tabulares para uso en mostrador.
2. **Interruptor `Modo Claro` ↔ `Modo Oscuro`:** Alterna entre la paleta **Rosa Pastel & Carbón (`#ECCCD9` / `#141213`)** sobre fondo claro y el tema oscuro de alto contraste.
3. **Botón `Actualizar Datos` (Cero Consumo Innecesario en la Nube):**
   - La aplicación actualiza los datos **automáticamente cada vez que guardas una operación** (facturar, registrar abono, marcar asistencia, crear producto) o cuando cambias de módulo.
   - Si otra persona registró algo desde otro equipo y quieres refrescar tu pantalla sin recargar el navegador, solo tocas **`Actualizar Datos`**.

---

## 2. Módulo 1: Centro de Mando POS & Dashboard Personalizado por Rol (`/dashboard`)

La pantalla principal (`/dashboard`) utiliza una arquitectura simétrica en **Rosa Pastel & Carbón EPB** con **Banner Editorial + Botonera Táctil POS + 4 Tarjetas KPI Estructuradas + 2 Zonas Operativas**, adaptando su contenido y protegiendo la información sensible según el rol que inicia sesión:

### 2.1. ¿Qué ve cada Rol y qué información se protege?
- **`ADMIN` (Dirección General — Vista Total 360°):** Ve Recaudo en Caja Hoy (Efectivo vs. Transferencias), Ocupación de Salones, Bandeja de Cartera y Cobro de Abonos, **Consolidado Financiero Total del Mes**, Ranking completo de comisiones de todos los asesores, Semáforo de Stock y Bitácora en vivo.
- **`CONTABILIDAD` (Auditoría Externa — Solo Lectura):** Ve todas las métricas financieras (Caja del día, Consolidado Mensual, Cartera, Comisiones y Bitácora), pero **sin botones de cobro ni edición**.
- **`ASESOR` (Recepción Académica):** Ve Recaudo académico del día (Abonos + Multas), Salones y Asistencia, **Alumnas hoy en salón con cuota pendiente** (con botón **`Registrar Abono`** y **`WhatsApp`**), Seguimiento de Preventas (`3d / 24h`), **su propia comisión del mes** y últimos recibos académicos. *(Se oculta el ingreso bruto mensual total de la escuela y las comisiones de otros compañeros).*
- **`VENTA` (Ejecutivo Tienda POS):** Ve Ventas Tienda POS del turno (Efectivo vs. Transferencias), **Mi Comisión Personal del Mes** y mis cierres, Clientes en Preventa Protegida (`3d / 24h`) listos para facturar en POS, Estado de Turno/Stock y bitácora exclusiva de facturas POS. *(Se oculta la cartera académica de alumnas, los abonos de matrículas, el ingreso bruto mensual de la escuela y las comisiones de otros vendedores).*
- **`PROFESOR` (Docente de Planta — 100% Académico):** Ve **1. Salones & Grupos**, **2. Asistencia de Alumnas (`Presentes / Ausentes / Reprog.`)**, **3. Mis Horas Biométricas del Mes**, horarios con barra de ocupación por salón y lista de alumnas inscritas con su estado de asistencia. *(Cero datos de dinero).*

---

## 3. Módulo 2: Terminal Caja POS, PC Compartido, Kits Rápidos, Reversos y Arqueo en 3 Pestañas (`/ventas`)

### 3.1. Organización del Módulo en 2 Sub-Vistas Superiores
1. **Pestaña `Toma de Pedidos (Terminal POS)`:** Contiene el catálogo, escáner, teclado numérico táctil **arriba a la vista** (activable/ocultable con el botón **`🔢 Teclado Numérico`**), kits rápidos y la comanda de cobro a la derecha.
2. **Pestaña `Historial de Facturas & Reversos`:** Contiene la tabla de facturas emitidas, reimpresión de tirillas térmicas de 80mm y el botón de **Reverso / Nota Crédito**.

### 3.2. Kits & Combos Rápidos de Academia (Carga en 1 Clic)
- Debajo de los filtros de categoría aparece la barra **`Kits & Combos Rápidos de Academia`**. Al tocar **`+ Cargar Kit`**, agrega todos los productos del combo al carrito y descuenta el stock individual de cada producto al facturar.

### 3.3. ¿Cómo operan 2 o más Vendedoras en UN SOLO Computador Compartido?
1. El computador permanece con la sesión abierta todo el turno.
2. En la parte superior de la Comanda aparece el bloque **`Vendedor que Factura (Comisión)`** con **botones grandes con el nombre de cada vendedora activa**.
3. **Cambio seguro con PIN / Código (`Opción B`):**
   - Cuando otra vendedora va a facturar su venta, toca el botón con su nombre.
   - Se despliega el campo corto **`Digite su PIN / Código...`** donde ingresa su código personal (`accessCode` o `sellerSecretCode`) y presiona `Enter` o `Confirmar`.
   - El sistema cambia el vendedor activo a su nombre para que la comisión quede asignada a ella sin cerrar la sesión del computador.

### 3.4. Las 3 Opciones Rápidas para Registrar Transferencias (Nequi, Bancolombia, Daviplata, Sistecrédito, Addi)
1. **Opción 1 — Solo los "Últimos 4 Dígitos" (1.5 segundos):** En el campo corto izquierdo **`Últ. 4 dígitos (Ej: 4890)`**, el cajero solo escribe los últimos 4 números del comprobante o del celular y el sistema arma automáticamente `Nequi Ult.4: #4890`.
2. **Opción 2 — Botón de 1 Toque `✓ Verificado Ahora (Auto-Hora)`:** Si el cajero ya verificó visualmente que llegó la transferencia al celular de la escuela, toca **`✓ Verificado Ahora (Auto-Hora)`** y el sistema rellena al instante `Verificado Nequi • 03:15 p. m.` sin digitar nada.
3. **Opción 3 — Botón `Pegar` o Referencia Completa:** Si copiaron el comprobante desde WhatsApp Web, con un clic en **`Pegar`** se inserta en el campo de referencia.

### 3.5. Discriminación Opcional de IVA (19%) y Reverso de Compra (Nota Crédito)
- **Casilla `Discriminar IVA (19%) en Factura`:** Permite elegir si la tirilla térmica debe mostrar el desglose de **Base Gravable + IVA (19%)** o emitirse como factura POS estándar.
- **Reverso de Compra / Cambio de Producto (Nota Crédito):** En la pestaña **`Historial de Facturas & Reversos`**, cada factura activa tiene el botón **`Reversar / Nota Crédito`**, que devuelve automáticamente las unidades al inventario, anula el cobro/comisión y deja constancia en Auditoría (`VOID_SALE`).

### 3.6. Nuevo Módulo de "Arqueo y Cierre Z" Reorganizado en 3 Pestañas + Selector de Fecha
1. **Selector de Fecha en la Cabecera (`📅 YYYY-MM-DD` + Botón `Hoy`):** Permite seleccionar **hoy, ayer o cualquier fecha anterior** para consultar las ventas y transferencias de ese día sin cerrar turno.
2. **Pestaña 1 — `1. Ver Ventas del Día` (Abre aquí por defecto — Solo Consulta):** Muestra el Efectivo Esperado en Cajón, Transferencias / Nequi, Total del Día, desglose por rubro (*Ventas POS*, *Abonos Alumnas*, *Multas*), listado de transferencias recibidas y botón para imprimir resumen parcial.
3. **Pestaña 2 — `2. Base Inicial y Gastos`:**
   - **Base Inicial del Cajón (+):** Dinero sencillo con el que abre la caja en la mañana (no llena el conteo físico final).
   - **Salida o Gasto de Caja Menor (-):** Descuenta pagos en efectivo (domicilios, papelería) del efectivo esperado en gaveta.
4. **Pestaña 3 — `3. Conteo Final (Cierre)`:** Se usa únicamente al final de la jornada. El campo **`Dinero Físico Contado al Final del Turno (COP)`** inicia **vacío** para que la cajera digite cuánto contó en billetes reales, calculando si hay **CUADRE EXACTO (`$0`)**, **SOBRANTE (`+`)** o **FALTANTE (`-`)** y generando el Reporte Z.

---

## 4. Módulo 3: Inventario (`Producto Nuevo` vs. `Reemplazar Código de Existente`) (`/inventario`)
- Al abrir **`Registrar Producto o Kit en Inventario`**, presenta **2 botones de decisión claros**:
  1. **`Producto Nuevo`**: Crear referencia desde cero.
  2. **`Reemplazar Código de Existente`**: Si un producto del catálogo cambió de empaque/código de barras, permite seleccionarlo y pistolear el nuevo código manteniendo fija la pestaña de reemplazo y conservando todo su historial.

---

## 5. Módulo 4: Gestión de Usuarios, Edición, Modalidad Hora vs. Contrato y Comisión Opcional (`/usuarios`)
- **Formulario alineado en 2 filas:** Rol, Nombre, Cédula y **PIN / Código de Acceso editable**.
- **Modalidad de Vinculación (`Por Hora` vs. `Por Contrato`):** Permite elegir si al funcionario se le liquida **Por Hora** (ingresando el valor de la hora en COP) o **Por Contrato Fijo** (`$0/hora`).
- **`% Comisión Ventas (Opcional)`:** Viene en `0%` por defecto para que no sea obligatorio.
- **Botón `Editar` en cada usuario:** Permite modificar en cualquier momento el rol, nombre, documento, PIN, modalidad de pago o comisión de cualquier usuario creado.

---

## 6. Módulo 5: Reportes Mensuales y Exportación del Libro Contable a Excel / CSV (`/reportes`)
- **`Comisiones (.CSV)`:** Planilla mensual de comisiones por asesor.
- **`Exportar Libro Contable Mes (.CSV / Excel)`:** Descarga en un solo archivo Excel todos los movimientos del mes (**Facturas POS + Abonos Académicos + Multas**) con fecha, número de recibo/factura, cliente/alumna, documento, concepto, medio de pago, referencia de transferencia y monto en COP.
