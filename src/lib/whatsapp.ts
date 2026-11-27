import { formatCop } from './utils';

/**
 * Normaliza un teléfono colombiano y genera el enlace oficial de WhatsApp (wa.me).
 */
export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  let normalized = digits;
  if (normalized.length === 10 && normalized.startsWith('3')) {
    normalized = `57${normalized}`;
  } else if (!normalized.startsWith('57') && normalized.length > 0) {
    normalized = `57${normalized}`;
  }
  const encodedText = encodeURIComponent(message);
  return normalized
    ? `https://wa.me/${normalized}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
}

export function buildDebtReminderMessage(params: {
  studentName: string;
  amountCop: number;
  reason?: string | null;
  programName?: string;
}): string {
  const firstName = params.studentName.trim().split(' ')[0] || params.studentName;
  return [
    `Hola *${firstName}*, te saludamos de *Escuela Profesional D' Belleza (EPB)* ✨.`,
    params.programName ? `Programa: *${params.programName}*` : '',
    `Te recordamos amablemente que a la fecha presentas un saldo académico pendiente por *${formatCop(params.amountCop)}* (${params.reason || 'Cuota académica'}).`,
    `Puedes realizar tu abono en recepción en efectivo o por transferencia (Nequi / Bancolombia). ¡Gracias por tu puntualidad!`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildPaymentReceiptMessage(params: {
  studentName: string;
  receiptNumber: string;
  amountPaidCop: number;
  newBalanceCop: number;
  concept: string;
  paymentMethod: string;
}): string {
  return [
    `*COMPROBANTE DE ABONO ACADÉMICO — EPB* ✨`,
    `Recibo No: *${params.receiptNumber}*`,
    `Alumna: *${params.studentName}*`,
    `Concepto: ${params.concept}`,
    `Medio de pago: ${params.paymentMethod}`,
    `Valor abonado: *${formatCop(params.amountPaidCop)}*`,
    `Nuevo saldo pendiente: *${formatCop(params.newBalanceCop)}*`,
    `¡Gracias por confiar en *Escuela Profesional D' Belleza*!`,
  ].join('\n');
}

export function buildPresaleFollowUpMessage(params: {
  clientName: string;
  sellerName: string;
  interestedItem: string;
}): string {
  const firstName = params.clientName.trim().split(' ')[0] || params.clientName;
  return [
    `Hola *${firstName}*, soy *${params.sellerName}* de *Escuela Profesional D' Belleza (EPB)* ✨.`,
    `Te escribo para acompañarte en tu proceso de inscripción o compra de *${params.interestedItem}*.`,
    `Recuerda que tienes tu cupo y beneficio reservado en preventa. ¿Tienes alguna duda para ayudarte hoy?`,
  ].join('\n');
}
