'use client';

import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  Fingerprint,
  GraduationCap,
  LayoutDashboard,
  Package,
  Printer,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  UserCog,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ManualSection {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  highlights: string[];
  steps: {
    heading: string;
    detail: string;
  }[];
}

const MANUAL_SECTIONS: ManualSection[] = [
  {
    id: 'arquitectura',
    category: 'General',
    title: '1. Navegación, Menú Auto-Dock y Esquema Híbrido',
    subtitle: 'Cómo moverse por la aplicación, usar el menú lateral inteligente y actualizar datos.',
    icon: Sparkles,
    badge: 'Base del Sistema',
    highlights: [
      'Menú Lateral Auto-Dock (64px): Se despliega automáticamente al acercar el mouse al borde izquierdo y se recoge al salir.',
      'Botón Fijar (📌 Pin): Si prefieres dejar el menú siempre abierto, toca el ícono de Pin arriba a la derecha del menú.',
      'Botón "Actualizar Datos": Refresca todos los módulos al instante sin recargar la página ni consumir recursos en segundo plano.',
      'Interruptores de Modo Táctil POS y Modo Claro/Oscuro en la barra superior.',
    ],
    steps: [
      {
        heading: 'Huella en Recepción + PIN/Código en Ventas',
        detail:
          'En Recepción se usa el lector biométrico USB para asistencia de alumnas. En el PC de Ventas o equipos sin huellero, cada funcionario ingresa y opera con su PIN / Código de Acceso asignado en Roles y Accesos.',
      },
      {
        heading: 'Acceso Directivo Silencioso (Llave Maestra)',
        detail:
          'Si el huellero USB no está disponible en la pantalla de inicio, haz clic en "¿El huellero USB está dañado o desconectado? • Protocolo de Contingencia" para desbloquear silenciosamente cualquier rol con la Llave Maestra de Dirección.',
      },
    ],
  },
  {
    id: 'dashboard',
    category: 'Inicio',
    title: '2. Centro de Mando POS & Dashboard por Rol (/dashboard)',
    subtitle: 'Cada tipo de usuario ve únicamente las métricas de su trabajo; la información sensible se protege.',
    icon: LayoutDashboard,
    badge: '5 Vistas por Rol',
    highlights: [
      'ADMIN (Dirección General): Vista 360° con Caja del día, Salones, Cartera, Consolidado Financiero Total del Mes y Ranking de Comisiones de todos.',
      'CONTABILIDAD: Vista financiera completa (Caja, Consolidado del Mes, Comisiones y Bitácora) en modo Solo Lectura.',
      'ASESOR (Recepción): Recaudo académico del día, Salones, Alumnas hoy en salón con saldo pendiente, Preventas 3d/24h y su propia comisión (oculta el total mensual de la escuela y comisiones de compañeros).',
      'VENTA (Tienda POS): Ventas POS del turno, Mi Comisión Personal del Mes, Preventas protegidas listas para facturar y Stock (oculta matrículas y cartera académica).',
      'PROFESOR (Docente): 100% académico (Mis salones, asistencia de alumnas y mis horas trabajadas en el mes). Cero datos de dinero.',
    ],
    steps: [
      {
        heading: 'Botón "Recibir Abono Rápido"',
        detail:
          'Disponible en el banner superior para ADMIN y ASESOR. Despliega un buscador rápido de alumnas con deuda para registrarles un abono e imprimir recibo o enviarlo por WhatsApp sin salir del Dashboard.',
      },
      {
        heading: 'Alerta "HOY EN SALÓN" y Cobro por WhatsApp',
        detail:
          'Las alumnas que tienen clase hoy y presentan cuota pendiente aparecen primero con la etiqueta roja "HOY EN SALÓN", botón verde "WhatsApp" para enviarles recordatorio en 1 clic y botón "Registrar Abono".',
      },
    ],
  },
  {
    id: 'ventas-pos',
    category: 'Caja y POS',
    title: '3. Terminal Caja POS, PC Compartido, Kits y Transferencias (/ventas)',
    subtitle: 'Facturación rápida con escáner USB, cambio de vendedora con PIN y reverso de facturas.',
    icon: ShoppingCart,
    badge: 'Mostrador POS',
    highlights: [
      'Dividido en 2 pestañas superiores: "Toma de Pedidos (Terminal POS)" e "Historial de Facturas & Reversos".',
      'Kits & Combos Rápidos de Academia: Carga todos los insumos de un kit al carrito con un solo clic y descuenta el stock de cada producto.',
      'Teclado Numérico Táctil arriba a la vista: Puedes mostrarlo u ocultarlo con el botón "🔢 Teclado Numérico".',
      'Impresión Térmica 80mm (70mm útiles): Imprime solo la tirilla limpia sin bordes del navegador ni desperdicio de papel.',
    ],
    steps: [
      {
        heading: '¿Cómo facturan 2 o más vendedoras en UN SOLO PC compartido?',
        detail:
          'En la comanda derecha aparece "Vendedor que Factura (Comisión)" con botones grandes con el nombre de cada vendedora. Para cambiar de vendedora, toca su nombre, digita su PIN / Código de Acceso y presiona Confirmar. Así cada venta asigna la comisión a quien realmente atendió sin cerrar la sesión del computador.',
      },
      {
        heading: 'Las 3 Opciones Rápidas para Transferencias (Nequi / Bancolombia / Daviplata)',
        detail:
          'Al elegir Transf / Nequi / Crédito tienes 3 opciones para no frenar la fila: (1) Escribir solo los "Últimos 4 dígitos" del comprobante o celular (#4890), (2) Tocar el botón verde "✓ Verificado Ahora (Auto-Hora)" que sella la hora exacta en 1 clic sin digitar nada, o (3) Tocar "Pegar" desde WhatsApp Web.',
      },
      {
        heading: 'Reverso de Compra / Cambio de Producto (Nota Crédito)',
        detail:
          'Si una factura ya emitida tiene un error o el cliente cambia un producto, entra a la pestaña "Historial de Facturas & Reversos" y pulsa "Reversar / Nota Crédito". Todas las unidades regresan automáticamente al inventario, se anula el cobro/comisión y queda auditado.',
      },
      {
        heading: 'Apertura de Gaveta Monedero Conectada a la Impresora',
        detail:
          'Como el cajón monedero va conectado por cable RJ11 detrás de la impresora térmica, en Windows -> Propiedades de Impresora -> Configuración de Dispositivo activa "Cash Drawer: Open Before Printing". Así la impresora abrirá la gaveta automáticamente al imprimir cualquier tirilla.',
      },
    ],
  },
  {
    id: 'arqueo-caja',
    category: 'Caja y POS',
    title: '4. Arqueo de Caja por Fecha, Base Inicial y Cierre Z (/ventas)',
    subtitle: 'Consulta cuánto se vendió en cualquier fecha sin cerrar turno, o haz el conteo físico final.',
    icon: Wallet,
    badge: '3 Pestañas Claras',
    highlights: [
      'Selector de Fecha arriba a la derecha (📅 YYYY-MM-DD): Permite ver las ventas, abonos y transferencias de hoy, ayer o cualquier día pasado sin cerrar el turno.',
      'Fórmula automática de cajón: Efectivo Esperado = Base Inicial (+) + Recaudo en Efectivo (POS + Abonos + Multas) - Gastos de Caja Menor (-).',
      'Todos los Abonos Académicos de alumnas se suman automáticamente al Arqueo de Caja del día.',
    ],
    steps: [
      {
        heading: 'Pestaña 1: "1. Ver Ventas del Día" (Solo Consulta)',
        detail:
          'Se abre por defecto. Muestra cuánto debe haber en Efectivo en Cajón, cuánto entró por Transferencias/Nequi, el Gran Total del día, el desglose entre Ventas POS, Abonos de Alumnas y Multas, la lista de transferencias recibidas y un botón para imprimir un resumen informativo sin cerrar turno.',
      },
      {
        heading: 'Pestaña 2: "2. Base Inicial y Gastos"',
        detail:
          'Aquí registras la Base Inicial con la que empieza el cajón en la mañana (ej. $100.000 para devueltas) y las Salidas o Gastos de Caja Menor (ej. pagar un domicilio o papelería en efectivo). Guardar la base suma al efectivo esperado pero NO llena el campo de conteo final.',
      },
      {
        heading: 'Pestaña 3: "3. Conteo Final (Cierre)"',
        detail:
          'Se usa solo al terminar la jornada. El campo "Dinero Físico Contado al Final del Turno" inicia vacío para que la cajera cuente los billetes reales del cajón y digite cuánto contó. El sistema indica si hay CUADRE EXACTO ($0), SOBRANTE (+) o FALTANTE (-) y guarda el Acta de Cierre Z en Auditoría.',
      },
    ],
  },
  {
    id: 'inventario',
    category: 'Tienda',
    title: '5. Inventario: Producto Nuevo vs. Reemplazo de Código (/inventario)',
    subtitle: 'Control de existencias, semáforo de alerta (%) y actualización de códigos de barras.',
    icon: Package,
    badge: 'Catálogo & Stock',
    highlights: [
      'Dos tarjetas de decisión al registrar con escáner: "Producto Nuevo" vs. "Reemplazar Código de Existente".',
      'Al elegir "Reemplazar Código de Existente" y pistolear con el escáner USB, la pestaña se mantiene fija en reemplazo sin reiniciarse.',
      'Porcentaje de alerta configurable por producto y globalmente (ej. avisar al llegar al 30% de la capacidad tope).',
    ],
    steps: [
      {
        heading: '¿Qué hacer cuando un producto cambia de código de barras pero es el mismo?',
        detail:
          'En /inventario abre "Nuevo Producto" (o pistolea el código nuevo), toca la tarjeta derecha "Reemplazar Código de Existente", elige el producto del catálogo y guarda. El producto conservará todo su historial y stock, quedando vinculado al nuevo código de barras.',
      },
    ],
  },
  {
    id: 'alumnos-abonos',
    category: 'Académico',
    title: '6. Alumnas, Abonos a Saldo, Multas y Certificados (/alumnos)',
    subtitle: 'Cartera académica, recibos térmicos de abono, envío por WhatsApp y control de horas.',
    icon: GraduationCap,
    badge: 'Cartera & Grados',
    highlights: [
      'Formulario de "Registrar Abono a Saldo" alineado con 3 medios de recepción (EFECTIVO, TRANSFERENCIA, MIXTO).',
      'Atajos de verificación de transferencia en 1 clic: "✓ Nequi (Auto-Hora)", "✓ Bancolombia (Auto-Hora)", "Últimos 4 dígitos" o "Pegar".',
      'Envío de comprobante de abono por WhatsApp en 1 clic junto al botón de Imprimir Recibo (80mm).',
      'Control automático de horas asistidas para autorizar o bloquear diplomas de grado.',
    ],
    steps: [
      {
        heading: 'Liquidación o Condonación de Multas por Inasistencia ($40.000 COP)',
        detail:
          'Cuando una alumna falta a clase, puede pagar la multa en caja asignando su clase de reprogramación, o Dirección (ADMIN) puede condonar/anular la multa registrando el motivo justificado (ej. incapacidad médica).',
      },
    ],
  },
  {
    id: 'agenda-asistencia',
    category: 'Académico',
    title: '7. Agendas por Salón (/agenda) y Asistencia (/asistencia)',
    subtitle: 'Programación sin cruces de horario, reubicación de inasistencias y semáforo de entrada.',
    icon: CalendarDays,
    badge: 'Salones & Huella',
    highlights: [
      'Validación automática que impide cruzar el mismo salón o el mismo profesor a la misma hora.',
      'Reubicación de alumnas que faltaron y posibilidad de reprogramar o saltar sesiones en el calendario.',
      'Semáforo audiovisual en /asistencia con cobro express de multas y abonos en la misma pantalla.',
    ],
    steps: [
      {
        heading: 'Programación Recurrente y Duplicación de Clases',
        detail:
          'Al crear una clase puedes publicarla para 1 día, 3 días seguidos, 5 días (Lun-Vie) o 4 semanas consecutivas, e inscribir a todo el grupo del programa con un solo botón.',
      },
    ],
  },
  {
    id: 'preventas',
    category: 'Comercial',
    title: '8. Preventas y Blindaje de Clientes (3 Días / 4to Día / 24h) (/preventas)',
    subtitle: 'Protección de comisiones por código secreto y contacto directo por WhatsApp.',
    icon: ShieldCheck,
    badge: 'Blindaje 72h / 24h',
    highlights: [
      'Fase 1 (Días 1 a 3 - 72h): La comisión queda blindada para el Vendedor A que registró al prospecto, aunque facture otro cajero.',
      'Fase 2 (4to Día): El prospecto se libera y cualquier asesor puede pulsar "Tomar Oportunidad (24h)" para ganar 24 horas de exclusividad.',
      'Fase 3 (Tras 24h sin cierre): Pasa a Piscina Libre para quien cierre la venta en POS.',
      'Botón verde "WhatsApp" en cada prospecto para hacer seguimiento en 1 clic con mensaje pre-llenado.',
    ],
    steps: [
      {
        heading: 'Bitácora de Seguimiento Comercial',
        detail:
          'Cada preventa tiene un botón "Bitácora" donde los asesores anotan acuerdos, llamadas o citas agendadas con fecha y hora automática.',
      },
    ],
  },
  {
    id: 'usuarios-nomina',
    category: 'Administración',
    title: '9. Usuarios, Edición de Roles, Hora vs. Contrato y Nómina (/usuarios y /personal)',
    subtitle: 'Creación y modificación de usuarios, modalidad Por Hora o Por Contrato y comisión opcional.',
    icon: UserCog,
    badge: 'Roles & Quincenas',
    highlights: [
      'Botón "Editar" en cada usuario de /usuarios: Permite cambiarle el Rol, Nombre, Cédula, PIN/Código, Modalidad de Pago o % de Comisión en cualquier momento.',
      'Dos modalidades de vinculación: "Por Hora" (liquida según horas trabajadas en /personal) o "Por Contrato" ($0/hora - salario fijo).',
      'Campo "% Comisión Ventas (Opcional)": Viene en 0% por defecto y no es obligatorio.',
      'Pases temporales con fecha de vencimiento automática para el rol CONTABILIDAD.',
    ],
    steps: [
      {
        heading: 'Liquidación Quincenal en /personal',
        detail:
          'Registra entradas y salidas (con opción de descontar -1h de almuerzo), alerta turnos abiertos por más de 10 horas, suma comisiones de la quincena, aplica bonos o vales/adelantos y genera el comprobante de pago quincenal imprimible.',
      },
    ],
  },
  {
    id: 'reportes-auditoria',
    category: 'Contabilidad',
    title: '10. Reportes, Exportación Libro Contable Excel y Auditoría (/reportes y /auditoria)',
    subtitle: 'Descarga completa a Excel (.CSV) para contabilidad y trazabilidad forense Antes → Después.',
    icon: FileSpreadsheet,
    badge: 'Excel & Auditoría',
    highlights: [
      'Botón "Comisiones (.CSV)": Descarga la planilla mensual de comisiones por vendedor.',
      'Botón "Exportar Libro Contable Mes (.CSV / Excel)": Descarga en una sola hoja todas las Facturas POS, Abonos Académicos y Multas del mes con fecha, recibo, cliente/alumna, documento, medio de pago, referencia Nequi/Banco y valor en COP.',
      'Auditoría Forense (/auditoria): Muestra en español claro cada cambio sensible (Antes → Después), anulaciones, descuentos y aperturas de caja.',
    ],
    steps: [
      {
        heading: 'Compatibilidad Directa con Microsoft Excel',
        detail:
          'Todos los archivos .CSV exportados incluyen codificación UTF-8 con BOM y separador de punto y coma (;), por lo que al hacer doble clic abren directamente en Excel con todas las columnas, tildes y signos de pesos separados.',
      },
    ],
  },
];

export function UserManualModal({ isOpen, onClose }: UserManualModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const categories = useMemo(() => {
    const set = new Set<string>();
    MANUAL_SECTIONS.forEach((s) => set.add(s.category));
    return Array.from(set);
  }, []);

  const filteredSections = useMemo(() => {
    return MANUAL_SECTIONS.filter((sec) => {
      if (activeCategory !== 'ALL' && sec.category !== activeCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = sec.title.toLowerCase().includes(q);
        const inSub = sec.subtitle.toLowerCase().includes(q);
        const inHighlights = sec.highlights.some((h) => h.toLowerCase().includes(q));
        const inSteps = sec.steps.some(
          (st) => st.heading.toLowerCase().includes(q) || st.detail.toLowerCase().includes(q)
        );
        return inTitle || inSub || inHighlights || inSteps;
      }
      return true;
    });
  }, [activeCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2.5 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="flex max-h-[93vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[#E4BDD0] bg-white text-[#141213] shadow-2xl dark:border-[#3A3035] dark:bg-[#181517] dark:text-[#F5EEF1]">
        {/* Cabecera Editorial Rosa & Carbón */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4BDD0] bg-gradient-to-r from-[#F4D7E4] via-[#FAF0F5] to-[#ECCCD9] px-5 py-4 dark:border-[#332B2F] dark:from-[#261F23] dark:via-[#1E191C] dark:to-[#281F24]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#141213] text-[#ECCCD9] shadow-xs dark:bg-[#ECCCD9] dark:!text-[#141213]">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#141213] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#ECCCD9] dark:bg-[#ECCCD9] dark:!text-[#141213]">
                  Guía Oficial Interactiva
                </span>
                <span className="text-[11px] font-semibold text-[#4A3E43] dark:text-[#C7B8C0]">
                  {MANUAL_SECTIONS.length} Módulos Documentados
                </span>
              </div>
              <h2 className="mt-0.5 font-serif text-lg sm:text-xl font-bold text-[#141213] dark:text-white">
                Manual de Usuario y Operación POS — Escuela Profesional D&apos; Belleza
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="h-9 gap-1.5 rounded-xl border-[#141213]/20 bg-white/90 text-xs font-bold text-[#141213] hover:bg-white dark:border-white/15 dark:bg-[#141213] dark:text-[#ECCCD9]"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Imprimir / PDF</span>
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#141213]/15 bg-white/90 text-neutral-700 hover:bg-white dark:border-white/15 dark:bg-[#252023] dark:text-white"
              title="Cerrar manual"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Barra de Búsqueda y Filtro por Categoría */}
        <div className="border-b border-[#F0DCE5] bg-[#FDF8FA] px-5 py-3 space-y-2.5 dark:border-[#2C2528] dark:bg-[#1E1A1C]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en el manual (ej: arqueo, base inicial, transferencia, pin, reemplazo código, contrato, rol)..."
              className="h-10 pl-10 text-xs font-medium bg-white dark:bg-[#161315]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveCategory('ALL')}
              className={`rounded-xl border px-3 py-1 text-xs font-bold transition ${
                activeCategory === 'ALL'
                  ? 'border-[#141213] bg-[#141213] text-[#ECCCD9] dark:border-[#ECCCD9] dark:bg-[#ECCCD9] dark:!text-[#141213]'
                  : 'border-[#E2B5C9] bg-white text-[#141213] hover:bg-[#FAF0F5] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white'
              }`}
            >
              Todos los Módulos ({MANUAL_SECTIONS.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`rounded-xl border px-3 py-1 text-xs font-bold transition ${
                  activeCategory === cat
                    ? 'border-[#141213] bg-[#141213] text-[#ECCCD9] dark:border-[#ECCCD9] dark:bg-[#ECCCD9] dark:!text-[#141213]'
                    : 'border-[#E2B5C9] bg-white text-[#141213] hover:bg-[#FAF0F5] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido Desplazable del Manual */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {filteredSections.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-500">
              No se encontraron secciones en el manual para &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            filteredSections.map((section) => {
              const Icon = section.icon;
              return (
                <div
                  key={section.id}
                  className="overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-2xs dark:border-[#332B2F] dark:bg-[#1E1A1C]"
                >
                  {/* Cinta Superior de la Sección */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F2E0E8] bg-gradient-to-r from-[#FAF0F5] to-white px-4 py-3 dark:border-[#2C2528] dark:from-[#261F23] dark:to-[#1E1A1C]">
                    <div className="flex items-center gap-2.5">
                      <span className="epb-pink-surface flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#ECCCD9] !text-[#141213]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-[#141213] dark:text-white">
                          {section.title}
                        </h3>
                        <p className="text-[11px] text-neutral-600 dark:text-[#B8A9B1]">
                          {section.subtitle}
                        </p>
                      </div>
                    </div>
                    <Badge variant="pink" className="text-[10px] font-bold">
                      {section.badge}
                    </Badge>
                  </div>

                  {/* Cuerpo de la Sección */}
                  <div className="p-4 space-y-3.5 text-xs">
                    {/* Puntos Clave */}
                    <div className="rounded-xl border border-[#F0DCE5] bg-[#FDF8FA] p-3 space-y-1.5 dark:border-[#2C2528] dark:bg-[#161315]">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A1E46] dark:text-[#ECCCD9]">
                        Puntos Clave del Módulo:
                      </div>
                      <ul className="space-y-1">
                        {section.highlights.map((hl, i) => (
                          <li key={i} className="flex items-start gap-2 text-neutral-700 dark:text-[#D8CAD1]">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span>{hl}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Paso a Paso / Preguntas Frecuentes */}
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {section.steps.map((st, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-neutral-200/80 bg-white p-3 dark:border-[#2F282C] dark:bg-[#221D20]"
                        >
                          <div className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                            {st.heading}
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-neutral-600 dark:text-[#C7B8C0]">
                            {st.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pie del Manual */}
        <div className="flex items-center justify-between border-t border-[#E4BDD0] bg-[#FAF0F5]/80 px-5 py-3 text-xs dark:border-[#332B2F] dark:bg-[#221D20]">
          <span className="text-[11px] font-medium text-neutral-600 dark:text-[#C7B8C0]">
            Escuela Profesional D&apos; Belleza (EPB) &bull; Manual Operativo Actualizado
          </span>
          <Button
            type="button"
            variant="pink"
            size="sm"
            onClick={onClose}
            className="h-8 bg-[#ECCCD9] px-4 text-xs font-bold text-[#141213]"
          >
            Entendido, Cerrar Manual
          </Button>
        </div>
      </div>
    </div>
  );
}
