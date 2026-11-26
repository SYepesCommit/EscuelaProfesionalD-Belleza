'use client';

import React from 'react';
import { Printer, Receipt, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SaleRecordItem } from '@/interfaces/sale.interface';
import { formatCop, formatDateTimeCo } from '@/lib/utils';

interface ThermalTicketModalProps {
  sale: SaleRecordItem | null;
  onClose: () => void;
}

export function ThermalTicketModal({ sale, onClose }: ThermalTicketModalProps) {
  if (!sale) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm max-h-[92vh] flex flex-col overflow-hidden rounded-3xl border border-[#E4BDD0] bg-white text-[#141213] shadow-2xl dark:border-[#3A3035] dark:bg-[#181517] dark:text-[#F5EEF1]">
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between border-b border-neutral-200 bg-[#FAF2F6] px-4 py-3 dark:border-[#332B2F] dark:bg-[#252023]">
          <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#141213] dark:text-[#ECCCD9]">
            <Receipt className="h-4 w-4" />
            Impresora Térmica 80mm
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-[#332B2F]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cuerpo del Ticket 80mm */}
        <div className="flex-1 overflow-y-auto p-5 font-mono text-xs">
          <div
            id="epb-pos-ticket-80mm"
            className="rounded-2xl border border-neutral-200 bg-[#FAF9FA] p-4 text-[#141213] shadow-inner dark:border-[#332B2F] dark:bg-[#121011] dark:text-[#F5EEF1]"
          >
            {/* Encabezado con datos reales de la institución */}
            <div className="text-center space-y-1">
              <div className="font-serif text-base sm:text-lg font-black tracking-wide text-[#141213] dark:text-white">
                ESCUELA PROFESIONAL D&apos; BELLEZA
              </div>
              <div className="text-[11px] font-bold text-neutral-600 dark:text-[#C4B5BC]">
                NIT: 900.584.219-4
              </div>
              <div className="text-[10px] text-neutral-500 dark:text-[#A898A1]">
                Sede Principal: Cra. 50 # 52-20, Centro, Medellín
              </div>
              <div className="text-[10px] text-neutral-500 dark:text-[#A898A1]">
                Tel: (604) 512 8890 &bull; WhatsApp: +57 300 422 1899
              </div>
              <div className="pt-1 text-[11px] font-extrabold text-[#141213] dark:text-[#ECCCD9]">
                *** FACTURA DE VENTA POS ***
              </div>
              <div className="text-xs font-black font-mono">
                {sale.invoiceNumber}
              </div>
              <div className="text-[10px] text-neutral-500">
                Fecha: {formatDateTimeCo(sale.createdAt)}
              </div>
            </div>

            {/* Separador punteado */}
            <div className="my-2.5 border-b border-dashed border-neutral-400 dark:border-[#44383E]" />

            {/* Datos del Cliente y Cajero */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-[#B8A8B0]">Cliente:</span>
                <strong className="text-right truncate max-w-[170px]">{sale.clientName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-[#B8A8B0]">Documento/NIT:</span>
                <span>{sale.clientDocument ?? 'Consumidor Final'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-[#B8A8B0]">Cajero POS:</span>
                <span>{sale.closingSellerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-[#B8A8B0]">Asesor Comisión:</span>
                <span className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                  {sale.commissionedSellerName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-[#B8A8B0]">Medio de Pago:</span>
                <strong className="uppercase">{sale.paymentMethod}</strong>
              </div>
            </div>

            {/* Separador punteado */}
            <div className="my-2.5 border-b border-dashed border-neutral-400 dark:border-[#44383E]" />

            {/* Tabla de Productos Vendidos */}
            <div className="space-y-1.5">
              <div className="grid grid-cols-12 text-[10px] font-black uppercase text-neutral-500 dark:text-[#B8A8B0]">
                <div className="col-span-6">Descripción</div>
                <div className="col-span-2 text-center">Cant</div>
                <div className="col-span-4 text-right">Subtotal</div>
              </div>

              {sale.items && sale.items.length > 0 ? (
                <div className="divide-y divide-dotted divide-neutral-300 dark:divide-[#332B2F] text-[11px]">
                  {sale.items.map((item) => (
                    <div key={item.id} className="py-1">
                      <div className="font-bold text-[#141213] dark:text-white">
                        {item.productName}
                      </div>
                      <div className="grid grid-cols-12 text-[10px] text-neutral-500 dark:text-[#A898A1]">
                        <div className="col-span-6 font-mono text-[9px]">
                          {item.productBarcode}
                        </div>
                        <div className="col-span-2 text-center font-bold text-[#141213] dark:text-white">
                          {item.quantity}
                        </div>
                        <div className="col-span-4 text-right font-bold text-[#141213] dark:text-[#ECCCD9]">
                          {formatCop(item.subtotalCop)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-1 text-[11px] text-neutral-500 text-center italic">
                  Detalle resumido en comprobante POS
                </div>
              )}
            </div>

            {/* Separador punteado */}
            <div className="my-2.5 border-b border-dashed border-neutral-400 dark:border-[#44383E]" />

            {/* Totales y Liquidación */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Subtotal Bruto:</span>
                <span>{formatCop(sale.subtotalCop)}</span>
              </div>
              {sale.discountCop > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold">
                  <span>Descuento Aplicado:</span>
                  <span>-{formatCop(sale.discountCop)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-neutral-300 pt-1.5 text-sm font-black dark:border-[#3A3035]">
                <span>TOTAL A PAGAR:</span>
                <span className="text-[#141213] dark:text-white">
                  {formatCop(sale.totalCop)}
                </span>
              </div>
            </div>

            {/* Blindaje de Comisión */}
            <div className="mt-3 rounded-xl bg-neutral-100 p-2 text-[9px] leading-tight text-neutral-600 dark:bg-[#1E191C] dark:text-[#C4B5BC]">
              <strong>Blindaje de Comisión:</strong> {sale.protectionRuleApplied}
            </div>

            {/* Pie de ticket y despedida */}
            <div className="mt-4 text-center space-y-1 border-t border-dashed border-neutral-300 pt-2 text-[10px] text-neutral-500 dark:border-[#3A3035] dark:text-[#A898A1]">
              <div className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                ¡Gracias por confiar en tu formación profesional!
              </div>
              <div>Régimen Simple de Tributación &bull; Resolución DIAN POS</div>
              <div>Conserve esta tirilla para garantías y soporte académico.</div>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-[#332B2F] dark:bg-[#221D20]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 font-bold dark:border-[#3A3035] dark:bg-[#252023] dark:text-white"
          >
            <Printer className="h-4 w-4" />
            Imprimir Tirilla (80mm)
          </Button>
          <Button
            type="button"
            variant="pink"
            size="sm"
            onClick={onClose}
            className="bg-[#ECCCD9] font-extrabold text-[#141213]"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
