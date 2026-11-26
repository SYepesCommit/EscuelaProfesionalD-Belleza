import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';
import { CertificateValidationResult } from '@/interfaces/student.interface';

const certificateActionSchema = z.object({
  studentId: z.string().min(1),
  operatorUserId: z.string().min(1),
  forcePrintByAdmin: z.boolean().default(false),
});

function getProgramRequiredHours(programName: string): number {
  const norm = programName.toLowerCase();
  if (
    norm.includes('técnico') ||
    norm.includes('tecnico') ||
    norm.includes('cosmetología') ||
    norm.includes('cosmetologia')
  ) {
    return 600;
  }
  if (
    norm.includes('peluquería') ||
    norm.includes('peluqueria') ||
    norm.includes('barbería') ||
    norm.includes('barberia')
  ) {
    return 300;
  }
  return 120;
}

export async function GET() {
  try {
    const certificates = await prisma.certificate.findMany({
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            documentId: true,
            programName: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(certificates);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error listando certificados' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = certificateActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Datos de validación de certificado inválidos' },
        { status: 400 }
      );
    }

    const { studentId, operatorUserId, forcePrintByAdmin } = parsed.data;

    const student = await prisma.student.findUniqueOrThrow({
      where: { id: studentId },
      include: {
        fines: {
          where: {
            OR: [{ status: 'PENDIENTE' }, { isClassRescheduled: false }],
          },
        },
        attendances: {
          where: { status: 'PRESENTE' },
          include: { schedule: true },
        },
      },
    });

    const pendingFinesTotalCop = student.fines
      .filter((f) => f.status === 'PENDIENTE')
      .reduce((acc, f) => acc + f.amountCop, 0);

    const hasPendingFines = student.fines.length > 0;
    const hasPendingAcademicBalance = student.pendingBalanceCop > 0;
    const hasDebtOrFine = hasPendingFines || hasPendingAcademicBalance || student.isBlocked;

    const attendedHours = student.attendances.reduce((acc, a) => {
      const durationHours = Math.max(
        1,
        Math.round(
          (a.schedule.endTime.getTime() - a.schedule.startTime.getTime()) / (1000 * 60 * 60)
        )
      );
      return acc + durationHours;
    }, 0);

    const requiredHours = getProgramRequiredHours(student.programName);
    const hasMetHours = attendedHours >= requiredHours;

    // 1. Bloqueo por horas insuficientes
    if (!hasMetHours && !forcePrintByAdmin) {
      await recordAuditLog({
        userId: operatorUserId,
        action: 'CERTIFICATE_BLOCKED_ATTEMPT',
        entity: 'Certificate',
        entityId: student.id,
        newData: {
          studentName: student.fullName,
          attendedHours,
          requiredHours,
          reason: 'Intento de certificación bloqueado por horas académicas insuficientes',
        },
      });

      const validation: CertificateValidationResult = {
        studentId: student.id,
        studentName: student.fullName,
        programName: student.programName,
        canPrint: false,
        hasPendingFines,
        pendingFinesTotalCop,
        hasPendingAcademicBalance,
        pendingAcademicBalanceCop: student.pendingBalanceCop,
        pendingAcademicBalanceReason: student.pendingBalanceReason,
        attendedHours,
        requiredHours,
        hasMetHours: false,
        alertMessage: `ALERTA ACADÉMICA: La estudiante ${student.fullName} ha completado ${attendedHours}h de las ${requiredHours}h mínimas requeridas para el programa "${student.programName}". Requiere autorización de Dirección o completar sus horas asistidas.`,
      };

      return NextResponse.json(validation, { status: 409 });
    }

    // 2. Bloqueo por deudas o multas activas
    if (hasDebtOrFine && !forcePrintByAdmin) {
      await recordAuditLog({
        userId: operatorUserId,
        action: 'CERTIFICATE_BLOCKED_ATTEMPT',
        entity: 'Certificate',
        entityId: student.id,
        newData: {
          studentName: student.fullName,
          pendingFinesTotalCop,
          pendingAcademicBalanceCop: student.pendingBalanceCop,
          reason: 'Intento de impresión bloqueado por deuda o multa activa',
        },
      });

      const balanceReasonText = student.pendingBalanceReason
        ? ` (Concepto: ${student.pendingBalanceReason})`
        : '';

      const validation: CertificateValidationResult = {
        studentId: student.id,
        studentName: student.fullName,
        programName: student.programName,
        canPrint: false,
        hasPendingFines,
        pendingFinesTotalCop,
        hasPendingAcademicBalance,
        pendingAcademicBalanceCop: student.pendingBalanceCop,
        pendingAcademicBalanceReason: student.pendingBalanceReason,
        attendedHours,
        requiredHours,
        hasMetHours: true,
        alertMessage: `ALERTA FINANCIERA: La estudiante ${student.fullName} presenta saldo pendiente de $${student.pendingBalanceCop.toLocaleString('es-CO')} COP${balanceReasonText}${hasPendingFines ? ` y multas por $${pendingFinesTotalCop.toLocaleString('es-CO')} COP` : ''}. Impresión de certificado restringida.`,
      };

      return NextResponse.json(validation, { status: 409 });
    }

    // Emitir certificado y dejar auditoría
    const certCode = `CERT-EPB-${Date.now().toString().slice(-6)}`;
    await prisma.$transaction(async (tx) => {
      const cert = await tx.certificate.create({
        data: {
          certificateCode: certCode,
          studentId: student.id,
          programName: student.programName,
          totalHours: requiredHours,
          status: 'EMITIDO',
          hasFinancialAlert: hasDebtOrFine,
          alertDetails: hasDebtOrFine
            ? 'Emitido con autorización administrativa pese a alerta financiera'
            : !hasMetHours
              ? 'Emitido con autorización de Dirección pese a horas incompletas'
              : null,
          issuedAt: new Date(),
          authorizedById: operatorUserId,
        },
      });

      await recordAuditLog(
        {
          userId: operatorUserId,
          action: 'CERTIFICATE_ISSUED',
          entity: 'Certificate',
          entityId: cert.id,
          newData: {
            certificateCode: certCode,
            studentName: student.fullName,
            programName: student.programName,
            hasFinancialAlert: hasDebtOrFine,
            attendedHours,
            requiredHours,
          },
        },
        tx
      );
    });

    const result: CertificateValidationResult = {
      studentId: student.id,
      studentName: student.fullName,
      programName: student.programName,
      canPrint: true,
      hasPendingFines,
      pendingFinesTotalCop,
      hasPendingAcademicBalance,
      pendingAcademicBalanceCop: student.pendingBalanceCop,
      pendingAcademicBalanceReason: student.pendingBalanceReason,
      attendedHours,
      requiredHours,
      hasMetHours,
      alertMessage: null,
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error validando certificado' },
      { status: 500 }
    );
  }
}
