import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeededDatabase } from '@/lib/seed';
import { getColombiaMonthBounds, getMonthKey } from '@/lib/utils';
import { SellerMonthlyCommissionSummary } from '@/interfaces/sale.interface';

export async function GET(request: Request) {
  try {
    await ensureSeededDatabase();
    const { searchParams } = new URL(request.url);
    const monthKey = searchParams.get('monthKey') || getMonthKey();

    const sellers = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ['VENTA', 'ASESOR', 'ADMIN'] },
      },
      orderBy: { fullName: 'asc' },
    });

    const commissions = await prisma.commission.findMany({
      where: { monthKey },
      include: { sale: true },
    });

    const summary: SellerMonthlyCommissionSummary[] = sellers.map((seller) => {
      const sellerCommissions = commissions.filter((c) => c.sellerId === seller.id);
      const totalSalesCop = sellerCommissions.reduce(
        (acc, c) => acc + c.saleTotalCop,
        0
      );
      const totalCommissionCop = sellerCommissions.reduce(
        (acc, c) => acc + c.amountCop,
        0
      );

      return {
        sellerId: seller.id,
        sellerName: seller.fullName,
        documentId: seller.documentId,
        monthKey,
        salesCount: sellerCommissions.length,
        totalSalesCop,
        commissionRatePct: seller.commissionRatePct,
        totalCommissionCop,
      };
    });

    // Desglose de ingresos mensuales totales en la escuela (Ventas POS + Abonos Estudiantes + Multas)
    const { startOfMonth: startDate, endOfMonth: endDate } = getColombiaMonthBounds(monthKey);

    const [monthSales, monthStudentPayments, monthFines, allStudents] = await Promise.all([
      prisma.sale.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'COMPLETADA',
        },
        include: { items: { include: { product: true } } },
      }),
      prisma.studentPayment.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        include: {
          student: { select: { fullName: true, documentId: true, programName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.fine.findMany({
        where: {
          paidAt: { gte: startDate, lte: endDate },
          status: 'PAGADA',
        },
        include: {
          student: { select: { fullName: true, documentId: true } },
        },
        orderBy: { paidAt: 'desc' },
      }),
      prisma.student.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    const posSalesTotalCop = monthSales.reduce((acc: number, s) => acc + s.totalCop, 0);
    const tuitionTotalCop = monthStudentPayments.reduce((acc: number, p) => acc + p.amountCop, 0);
    const finesTotalCop = monthFines.reduce((acc: number, f) => acc + f.amountCop, 0);
    const schoolGrossIncomeCop = posSalesTotalCop + tuitionTotalCop + finesTotalCop;

    // Agrupación de alumnas matriculadas por programa
    const programMap = new Map<string, number>();
    for (const st of allStudents) {
      const prog = st.programName || 'General';
      programMap.set(prog, (programMap.get(prog) || 0) + 1);
    }

    const courseBreakdown = Array.from(programMap.entries()).map(([programName, count], idx) => ({
      courseId: `PROG-${idx + 1}`,
      courseName: programName,
      newStudentsCount: count,
      estimatedIncomeCop: count * 1500000,
    }));

    const detailedAccountingMovements = [
      ...monthSales.map((s) => ({
        date: s.createdAt.toISOString(),
        category: 'VENTA_POS',
        referenceNumber: s.invoiceNumber,
        thirdPartyName: s.clientName,
        thirdPartyDocument: s.clientDocument || 'MOSTRADOR',
        concept: s.items.map((i) => `${i.quantity}x ${i.product.name}`).join(' + ') || 'Venta POS',
        paymentMethod: s.paymentMethod,
        paymentReference: s.protectionRuleApplied,
        amountCop: s.totalCop,
      })),
      ...monthStudentPayments.map((p) => ({
        date: p.createdAt.toISOString(),
        category: 'ABONO_ACADEMICO',
        referenceNumber: p.receiptNumber || p.id.slice(0, 8).toUpperCase(),
        thirdPartyName: p.student.fullName,
        thirdPartyDocument: p.student.documentId,
        concept: `${p.concept} (${p.student.programName})`,
        paymentMethod: p.paymentMethod,
        paymentReference: p.paymentReference || 'DIRECTO',
        amountCop: p.amountCop,
      })),
      ...monthFines.map((f) => ({
        date: (f.paidAt || f.createdAt).toISOString(),
        category: 'MULTA_INASISTENCIA',
        referenceNumber: `MUL-${f.id.slice(0, 6).toUpperCase()}`,
        thirdPartyName: f.student.fullName,
        thirdPartyDocument: f.student.documentId,
        concept: f.reason,
        paymentMethod: f.paymentMethod,
        paymentReference: f.paymentReference || 'CAJA',
        amountCop: f.amountCop,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      monthKey,
      summary,
      financialOverview: {
        posSalesTotalCop,
        tuitionTotalCop,
        finesTotalCop,
        schoolGrossIncomeCop,
        salesCount: monthSales.length,
        tuitionReceiptsCount: monthStudentPayments.length,
        finesCount: monthFines.length,
        courseBreakdown,
        detailedAccountingMovements,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error generando reporte' },
      { status: 500 }
    );
  }
}
