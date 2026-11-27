import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeededDatabase } from '@/lib/seed';
import { getColombiaDayBounds, getColombiaMonthBounds, getMonthKey } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    await ensureSeededDatabase();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';

    const now = new Date();
    const { startOfDay, endOfDay } = getColombiaDayBounds(now);

    const monthKey = getMonthKey(now);
    const { startOfMonth, endOfMonth } = getColombiaMonthBounds(monthKey);

    const [
      salesToday,
      studentPaymentsToday,
      finesPaidToday,
      shiftCloseLogToday,
      schedulesTodayRaw,
      allActiveSchedulesRaw,
      studentsWithDebt,
      allActiveProducts,
      activePresalesRaw,
      monthSales,
      monthStudentPayments,
      monthFinesPaid,
      monthCommissions,
      recentSales,
      recentStudentPayments,
      recentPaidFines,
      userTimeLogsThisMonth,
    ] = await Promise.all([
      // 1. Ventas POS de hoy
      prisma.sale.findMany({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
          status: 'COMPLETADA',
        },
        include: {
          closingSeller: { select: { id: true, fullName: true } },
          commissionedSeller: { select: { id: true, fullName: true } },
          items: { include: { product: { select: { name: true, sku: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // 2. Abonos académicos de hoy
      prisma.studentPayment.findMany({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
        include: {
          student: { select: { id: true, fullName: true, documentId: true, programName: true } },
          operatorUser: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // 3. Multas pagadas hoy
      prisma.fine.findMany({
        where: {
          paidAt: { gte: startOfDay, lte: endOfDay },
          status: 'PAGADA',
        },
        include: {
          student: { select: { id: true, fullName: true, documentId: true } },
          collectedByUser: { select: { id: true, fullName: true } },
        },
        orderBy: { paidAt: 'desc' },
      }),

      // 4. Estado de Cierre Z de hoy
      prisma.auditLog.findFirst({
        where: {
          action: { in: ['CASH_REGISTER_CLOSE_SHIFT', 'CASH_REGISTER_Z_REPORT'] },
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
        include: {
          user: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // 5. Clases programadas hoy
      prisma.classSchedule.findMany({
        where: {
          isActive: true,
          startTime: { gte: startOfDay, lte: endOfDay },
        },
        include: {
          room: { select: { name: true, code: true } },
          teacher: { select: { id: true, fullName: true } },
          enrollments: {
            include: {
              student: {
                select: {
                  id: true,
                  fullName: true,
                  documentId: true,
                  programName: true,
                  pendingBalanceCop: true,
                  pendingBalanceReason: true,
                  isBlocked: true,
                },
              },
            },
          },
          attendances: {
            select: {
              studentId: true,
              status: true,
              verifiedByBiometry: true,
              checkInTime: true,
            },
          },
        },
        orderBy: { startTime: 'asc' },
      }),

      // 6. Clases activas cercanas (respaldo si hoy no hay clases exactas en seed)
      prisma.classSchedule.findMany({
        where: { isActive: true },
        include: {
          room: { select: { name: true, code: true } },
          teacher: { select: { id: true, fullName: true } },
          enrollments: {
            include: {
              student: {
                select: {
                  id: true,
                  fullName: true,
                  documentId: true,
                  programName: true,
                  pendingBalanceCop: true,
                  pendingBalanceReason: true,
                  isBlocked: true,
                },
              },
            },
          },
          attendances: {
            select: {
              studentId: true,
              status: true,
              verifiedByBiometry: true,
              checkInTime: true,
            },
          },
        },
        orderBy: { startTime: 'asc' },
        take: 6,
      }),

      // 7. Estudiantes activos (para cartera y bloqueos)
      prisma.student.findMany({
        where: { isActive: true },
        select: {
          id: true,
          fullName: true,
          documentId: true,
          phone: true,
          programName: true,
          pendingBalanceCop: true,
          pendingBalanceReason: true,
          isBlocked: true,
          blockReason: true,
        },
        orderBy: { pendingBalanceCop: 'desc' },
      }),

      // 8. Productos activos para semáforo de stock
      prisma.product.findMany({
        where: { isActive: true },
        orderBy: { stock: 'asc' },
      }),

      // 9. Preventas activas protegidas (detalle para VENTA y ASESOR)
      prisma.clientPresale.findMany({
        where: {
          status: { in: ['PROTEGIDO_3_DIAS', 'SEGUNDA_OPORTUNIDAD_24H'] },
        },
        include: {
          initialSeller: { select: { id: true, fullName: true } },
          secondSeller: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),

      // 10. Ventas del mes
      prisma.sale.findMany({
        where: {
          createdAt: { gte: startOfMonth, lte: endOfMonth },
          status: 'COMPLETADA',
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, category: true, sku: true } },
            },
          },
        },
      }),

      // 11. Abonos del mes
      prisma.studentPayment.findMany({
        where: {
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),

      // 12. Multas pagadas del mes
      prisma.fine.findMany({
        where: {
          paidAt: { gte: startOfMonth, lte: endOfMonth },
          status: 'PAGADA',
        },
      }),

      // 13. Comisiones del mes
      prisma.commission.findMany({
        where: { monthKey },
        include: {
          seller: { select: { id: true, fullName: true, role: true, commissionRatePct: true } },
        },
      }),

      // 14. Últimas ventas (incluyendo anuladas para el feed en vivo)
      prisma.sale.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          closingSeller: { select: { id: true, fullName: true } },
        },
      }),

      // 15. Últimos abonos académicos
      prisma.studentPayment.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { fullName: true, documentId: true } },
          operatorUser: { select: { id: true, fullName: true } },
        },
      }),

      // 16. Últimas multas pagadas
      prisma.fine.findMany({
        where: { status: 'PAGADA' },
        take: 4,
        orderBy: { paidAt: 'desc' },
        include: {
          student: { select: { fullName: true, documentId: true } },
        },
      }),

      // 17. Registros biométricos de horas del usuario actual en el mes
      userId
        ? prisma.staffTimeLog.findMany({
            where: {
              staffId: userId,
              checkInAt: { gte: startOfMonth, lte: endOfMonth },
            },
            orderBy: { checkInAt: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    // --- A. Pulso de Caja de Hoy ---
    const sumByMethod = <T extends { paymentMethod: string }>(
      rows: T[],
      getAmount: (row: T) => number
    ) => {
      let cashCop = 0;
      let transferCop = 0;
      let cardCop = 0;
      for (const r of rows) {
        const amt = getAmount(r);
        if (r.paymentMethod === 'EFECTIVO') cashCop += amt;
        else if (r.paymentMethod === 'TRANSFERENCIA') transferCop += amt;
        else if (r.paymentMethod === 'TARJETA') cardCop += amt;
        else {
          const half = Math.round(amt / 2);
          cashCop += half;
          transferCop += amt - half;
        }
      }
      return {
        cashCop,
        transferCop,
        cardCop,
        totalCop: cashCop + transferCop + cardCop,
      };
    };

    const salesBox = sumByMethod(salesToday, (s) => s.totalCop);
    const tuitionBox = sumByMethod(studentPaymentsToday, (p) => p.amountCop);
    const finesBox = sumByMethod(finesPaidToday, (f) => f.amountCop);

    const cashPulse = {
      expectedCashCop: salesBox.cashCop + tuitionBox.cashCop + finesBox.cashCop,
      expectedTransfCop: salesBox.transferCop + tuitionBox.transferCop + finesBox.transferCop,
      expectedCardCop: salesBox.cardCop + tuitionBox.cardCop + finesBox.cardCop,
      grandTotalCop: salesBox.totalCop + tuitionBox.totalCop + finesBox.totalCop,
      salesCount: salesToday.length,
      salesTotalCop: salesBox.totalCop,
      salesCashCop: salesBox.cashCop,
      salesTransfCop: salesBox.transferCop,
      tuitionCount: studentPaymentsToday.length,
      tuitionTotalCop: tuitionBox.totalCop,
      tuitionCashCop: tuitionBox.cashCop,
      tuitionTransfCop: tuitionBox.transferCop,
      finesCount: finesPaidToday.length,
      finesTotalCop: finesBox.totalCop,
      shiftStatus: shiftCloseLogToday ? 'CERRADO_HOY' : 'ABIERTO',
      lastCloseInfo: shiftCloseLogToday
        ? {
            closedAt: shiftCloseLogToday.createdAt.toISOString(),
            closedBy: shiftCloseLogToday.user.fullName,
          }
        : null,
    };

    // --- B. Clases del Día + Alerta de Cartera en Clase ---
    const effectiveSchedules =
      schedulesTodayRaw.length > 0 ? schedulesTodayRaw : allActiveSchedulesRaw;
    const isShowingTodayExact = schedulesTodayRaw.length > 0;

    let totalEnrolledToday = 0;
    let presentCount = 0;
    let absentCount = 0;
    let rescheduledCount = 0;
    const studentsInClassWithDebtMap = new Map<
      string,
      {
        id: string;
        fullName: string;
        documentId: string;
        pendingBalanceCop: number;
        pendingBalanceReason: string | null;
        courseName: string;
        roomName: string;
        startTime: string;
      }
    >();

    const schedulesList = effectiveSchedules.map((sch) => {
      totalEnrolledToday += sch.enrollments.length;
      for (const att of sch.attendances) {
        if (att.status === 'PRESENTE') presentCount++;
        else if (att.status === 'AUSENTE') absentCount++;
        else if (att.status === 'REPROGRAMADO') rescheduledCount++;
      }

      const debtorsInClass = sch.enrollments
        .filter((enr) => enr.student.pendingBalanceCop > 0)
        .map((enr) => {
          studentsInClassWithDebtMap.set(enr.student.id, {
            id: enr.student.id,
            fullName: enr.student.fullName,
            documentId: enr.student.documentId,
            pendingBalanceCop: enr.student.pendingBalanceCop,
            pendingBalanceReason: enr.student.pendingBalanceReason,
            courseName: sch.courseName,
            roomName: sch.room.name,
            startTime: sch.startTime.toISOString(),
          });
          return {
            id: enr.student.id,
            fullName: enr.student.fullName,
            pendingBalanceCop: enr.student.pendingBalanceCop,
          };
        });

      const attendanceMap = new Map(sch.attendances.map((a) => [a.studentId, a.status]));

      // Lista puramente académica de alumnas inscritas (sin datos financieros para el rol PROFESOR)
      const enrolledStudentsAcademic = sch.enrollments.map((enr) => ({
        id: enr.student.id,
        fullName: enr.student.fullName,
        documentId: enr.student.documentId,
        programName: enr.student.programName,
        attendanceStatus: attendanceMap.get(enr.student.id) || 'PENDIENTE',
      }));

      return {
        id: sch.id,
        title: sch.title,
        courseName: sch.courseName,
        roomName: sch.room.name,
        roomCode: sch.room.code,
        teacherId: sch.teacher.id,
        teacherName: sch.teacher.fullName,
        startTime: sch.startTime.toISOString(),
        endTime: sch.endTime.toISOString(),
        enrolledCount: sch.enrollments.length,
        maxStudents: sch.maxStudents,
        presentCount: sch.attendances.filter((a) => a.status === 'PRESENTE').length,
        absentCount: sch.attendances.filter((a) => a.status === 'AUSENTE').length,
        debtorsInClass,
        enrolledStudentsAcademic,
      };
    });

    // --- C. Cartera Académica Global ---
    const debtorsList = studentsWithDebt.filter((s) => s.pendingBalanceCop > 0);
    const totalPendingBalanceCop = debtorsList.reduce((acc, s) => acc + s.pendingBalanceCop, 0);
    const blockedStudentsCount = studentsWithDebt.filter((s) => s.isBlocked).length;

    // --- D. Semáforo de Stock Crítico ---
    const criticalStockProducts = allActiveProducts
      .filter((p) => p.stock <= p.minStock)
      .slice(0, 6)
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        stock: p.stock,
        minStock: p.minStock,
        priceCop: p.priceCop,
      }));

    // --- E. Top Productos Vendidos del Mes ---
    const productSalesMap = new Map<
      string,
      { id: string; name: string; sku: string; quantitySold: number; revenueCop: number }
    >();
    for (const sale of monthSales) {
      for (const item of sale.items) {
        const existing = productSalesMap.get(item.productId) || {
          id: item.productId,
          name: item.product.name,
          sku: item.product.sku,
          quantitySold: 0,
          revenueCop: 0,
        };
        existing.quantitySold += item.quantity;
        existing.revenueCop += item.subtotalCop;
        productSalesMap.set(item.productId, existing);
      }
    }
    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.revenueCop - a.revenueCop)
      .slice(0, 5);

    // --- F. Ranking de Comisiones del Mes ---
    const sellerMap = new Map<
      string,
      {
        sellerId: string;
        sellerName: string;
        salesCount: number;
        totalSalesCop: number;
        totalCommissionCop: number;
        commissionRatePct: number;
      }
    >();
    for (const comm of monthCommissions) {
      const existing = sellerMap.get(comm.sellerId) || {
        sellerId: comm.sellerId,
        sellerName: comm.seller.fullName,
        salesCount: 0,
        totalSalesCop: 0,
        totalCommissionCop: 0,
        commissionRatePct: comm.seller.commissionRatePct,
      };
      existing.salesCount += 1;
      existing.totalSalesCop += comm.saleTotalCop;
      existing.totalCommissionCop += comm.amountCop;
      sellerMap.set(comm.sellerId, existing);
    }
    const topCommissions = Array.from(sellerMap.values())
      .sort((a, b) => b.totalCommissionCop - a.totalCommissionCop)
      .slice(0, 5);

    // --- G. Comparativa Mensual (Dirección / Admin / Contabilidad) ---
    const monthPosCop = monthSales.reduce((acc, s) => acc + s.totalCop, 0);
    const monthTuitionCop = monthStudentPayments.reduce((acc, p) => acc + p.amountCop, 0);
    const monthFinesCop = monthFinesPaid.reduce((acc, f) => acc + f.amountCop, 0);
    const monthGrossCop = monthPosCop + monthTuitionCop + monthFinesCop;

    // --- H. Métricas Personales del Usuario Activo (Para VENTA, ASESOR y PROFESOR) ---
    const myCommissions = userId
      ? monthCommissions.filter((c) => c.sellerId === userId)
      : [];
    const myMonthSalesCount = myCommissions.length;
    const myMonthSalesCop = myCommissions.reduce((acc, c) => acc + c.saleTotalCop, 0);
    const myMonthCommissionCop = myCommissions.reduce((acc, c) => acc + c.amountCop, 0);

    const mySalesToday = userId
      ? salesToday.filter(
          (s) => s.closingSellerId === userId || s.commissionedSellerId === userId
        )
      : [];
    const mySalesTodayCop = mySalesToday.reduce((acc, s) => acc + s.totalCop, 0);

    const myWorkedHoursMonth = userTimeLogsThisMonth.reduce(
      (acc, log) => acc + (log.workedHoursDecimal || 0),
      0
    );

    const activePresalesList = activePresalesRaw.map((pr) => ({
      id: pr.id,
      clientName: pr.clientName,
      clientDocument: pr.clientDocument,
      clientPhone: pr.clientPhone,
      interestedCourseOrItem: pr.interestedCourseOrItem,
      status: pr.status,
      initialSellerId: pr.initialSellerId,
      initialSellerName: pr.initialSeller.fullName,
      secondSellerId: pr.secondSellerId,
      secondSellerName: pr.secondSeller?.fullName || null,
      protectedUntilDay3: pr.protectedUntilDay3.toISOString(),
      secondWindowUntil24h: pr.secondWindowUntil24h?.toISOString() || null,
    }));

    // --- I. Feed en Vivo (Últimos Movimientos Combinados) ---
    const liveFeed = [
      ...recentSales.map((s) => ({
        id: `SALE-${s.id}`,
        type: s.status === 'ANULADA' ? ('SALE_VOID' as const) : ('SALE_POS' as const),
        title:
          s.status === 'ANULADA'
            ? `Factura Anulada ${s.invoiceNumber}`
            : `Venta POS ${s.invoiceNumber}`,
        subtitle: `${s.clientName} • Cajero: ${s.closingSeller.fullName}`,
        amountCop: s.totalCop,
        paymentMethod: s.paymentMethod,
        createdAt: s.createdAt.toISOString(),
      })),
      ...recentStudentPayments.map((p) => ({
        id: `PAY-${p.id}`,
        type: 'STUDENT_PAYMENT' as const,
        title: `Abono Académico ${p.receiptNumber || ''}`.trim(),
        subtitle: `${p.student.fullName} • ${p.concept}`,
        amountCop: p.amountCop,
        paymentMethod: p.paymentMethod,
        createdAt: p.createdAt.toISOString(),
      })),
      ...recentPaidFines.map((f) => ({
        id: `FINE-${f.id}`,
        type: 'FINE_PAID' as const,
        title: 'Multa de Inasistencia Pagada',
        subtitle: `${f.student.fullName} (CC ${f.student.documentId})`,
        amountCop: f.amountCop,
        paymentMethod: f.paymentMethod,
        createdAt: (f.paidAt || f.createdAt).toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);

    return NextResponse.json({
      generatedAt: now.toISOString(),
      monthKey,
      cashPulse,
      academicToday: {
        isShowingTodayExact,
        schedulesCount: schedulesList.length,
        totalEnrolledToday,
        presentCount,
        absentCount,
        rescheduledCount,
        schedules: schedulesList,
        studentsInClassWithDebt: Array.from(studentsInClassWithDebtMap.values()),
      },
      portfolio: {
        totalStudentsCount: studentsWithDebt.length,
        debtorsCount: debtorsList.length,
        blockedStudentsCount,
        totalPendingBalanceCop,
        topDebtors: debtorsList.slice(0, 6),
      },
      inventory: {
        totalActiveProducts: allActiveProducts.length,
        criticalCount: allActiveProducts.filter((p) => p.stock <= p.minStock).length,
        criticalStockProducts,
        topProducts,
      },
      commercial: {
        activePresalesCount: activePresalesRaw.length,
        activePresalesList,
        topCommissions,
        monthlyOverview: {
          monthKey,
          posSalesTotalCop: monthPosCop,
          tuitionTotalCop: monthTuitionCop,
          finesTotalCop: monthFinesCop,
          schoolGrossIncomeCop: monthGrossCop,
          posSalesCount: monthSales.length,
          tuitionCount: monthStudentPayments.length,
          finesCount: monthFinesPaid.length,
        },
      },
      personalMetrics: {
        mySalesTodayCount: mySalesToday.length,
        mySalesTodayCop,
        myMonthSalesCount,
        myMonthSalesCop,
        myMonthCommissionCop,
        myWorkedHoursMonth: Number(myWorkedHoursMonth.toFixed(1)),
        myLogsCountMonth: userTimeLogsThisMonth.length,
      },
      liveFeed,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : 'Error cargando el Centro de Mando Dashboard',
      },
      { status: 500 }
    );
  }
}
