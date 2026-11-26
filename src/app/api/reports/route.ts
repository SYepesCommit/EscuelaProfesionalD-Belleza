import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeededDatabase } from '@/lib/seed';
import { getMonthKey } from '@/lib/utils';
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
    const [startYear, startMonth] = monthKey.split('-').map(Number);
    const startDate = new Date(startYear, startMonth - 1, 1);
    const endDate = new Date(startYear, startMonth, 0, 23, 59, 59);

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
      }),
      prisma.fine.findMany({
        where: {
          paidAt: { gte: startDate, lte: endDate },
          status: 'PAGADA',
        },
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
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error generando reporte' },
      { status: 500 }
    );
  }
}
