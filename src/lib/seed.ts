import { prisma } from '@/lib/prisma';

/**
 * Inicializa datos base de la Escuela Profesional D' Belleza (EPB)
 * si la base de datos está recién creada, para que las 3 terminales
 * tengan usuarios, salones, alumnos, preventas y productos listos.
 */
export async function ensureSeededDatabase(): Promise<void> {
  const userCount = await prisma.user.count();
  const roomCount = await prisma.room.count();

  if (userCount > 0 && roomCount > 0) return;

  if (userCount > 0 && roomCount === 0) {
    // Limpiar para re-sembrar completo y sin colisiones
    await prisma.auditLog.deleteMany();
    await prisma.user.deleteMany();
  }

  const admin = await prisma.user.create({
    data: {
      documentId: '101000100',
      fullName: 'Dra. Valentina Montoya (Directora)',
      email: 'direccion@epbelleza.edu.co',
      phone: '3001112233',
      role: 'ADMIN',
      accessCode: 'ADMIN-01',
      sellerSecretCode: 'SEC-ADMIN',
      fingerprintTemplate: 'FP_ADMIN_01',
      hourlyRateCop: 35000,
      commissionRatePct: 5.0,
    },
  });

  await prisma.user.create({
    data: {
      documentId: '101000200',
      fullName: 'Mariana Gómez (Asesora Académica)',
      email: 'asesoria@epbelleza.edu.co',
      phone: '3002223344',
      role: 'ASESOR',
      accessCode: 'ASESOR-01',
      sellerSecretCode: 'SEC-ASESOR',
      fingerprintTemplate: 'FP_ASESOR_01',
      hourlyRateCop: 18000,
      commissionRatePct: 3.0,
    },
  });

  const sellerA = await prisma.user.create({
    data: {
      documentId: '101000300',
      fullName: 'Laura Ríos (Ejecutiva de Venta A)',
      email: 'laura@epbelleza.edu.co',
      phone: '3003334455',
      role: 'VENTA',
      accessCode: 'VENTA-01',
      sellerSecretCode: 'LAURA-777',
      fingerprintTemplate: 'FP_VENTA_01',
      hourlyRateCop: 16000,
      commissionRatePct: 7.0,
    },
  });

  const sellerB = await prisma.user.create({
    data: {
      documentId: '101000400',
      fullName: 'Camila Salazar (Ejecutiva de Venta B)',
      email: 'camila@epbelleza.edu.co',
      phone: '3004445566',
      role: 'VENTA',
      accessCode: 'VENTA-02',
      sellerSecretCode: 'CAMILA-888',
      fingerprintTemplate: 'FP_VENTA_02',
      hourlyRateCop: 16000,
      commissionRatePct: 7.0,
    },
  });

  const guestExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.user.create({
    data: {
      documentId: '101000900',
      fullName: 'Dr. Ricardo Castaño (Contador / Invitado)',
      email: 'contabilidad@epbelleza.edu.co',
      phone: '3009990011',
      role: 'CONTABILIDAD',
      accessCode: 'CONTA-01',
      fingerprintTemplate: 'FP_CONTA_01',
      hourlyRateCop: 0,
      commissionRatePct: 0,
      isTemporaryGuest: true,
      accessExpiresAt: guestExpires,
    },
  });

  const teacher1 = await prisma.user.create({
    data: {
      documentId: '101000500',
      fullName: 'Prof. Sofía Restrepo (Cosmetología)',
      email: 'sofia@epbelleza.edu.co',
      phone: '3005556677',
      role: 'PROFESOR',
      accessCode: 'PROF-01',
      fingerprintTemplate: 'FP_PROF_01',
      hourlyRateCop: 28000,
    },
  });

  const teacher2 = await prisma.user.create({
    data: {
      documentId: '101000600',
      fullName: 'Prof. Andrés Vélez (Estilismo & Color)',
      email: 'andres@epbelleza.edu.co',
      phone: '3006667788',
      role: 'PROFESOR',
      accessCode: 'PROF-02',
      fingerprintTemplate: 'FP_PROF_02',
      hourlyRateCop: 28000,
    },
  });

  // Salones
  const room1 = await prisma.room.create({
    data: {
      name: 'Salón Vip 1 - Estilismo & Colorimetría',
      code: 'SALON-01',
      capacity: 15,
      description: 'Tocadores iluminados y lavacabezas profesionales',
    },
  });

  const room2 = await prisma.room.create({
    data: {
      name: 'Salón 2 - Estética Facial & Corporal',
      code: 'SALON-02',
      capacity: 12,
      description: 'Camillas hidráulicas y aparatología estética',
    },
  });

  const room3 = await prisma.room.create({
    data: {
      name: 'Salón 3 - Manicure, Nail Art & Pestañas',
      code: 'SALON-03',
      capacity: 18,
      description: 'Mesas con extractor y lámparas UV LED',
    },
  });

  // Estudiantes
  const student1 = await prisma.student.create({
    data: {
      documentId: '1098765431',
      fullName: 'Daniela Ospina Pérez',
      phone: '3112223344',
      email: 'daniela.ospina@gmail.com',
      programName: 'Técnico Profesional en Cosmetología y Estética Integral',
      fingerprintTemplate: 'FP_EST_01',
      isBlocked: false,
      pendingBalanceCop: 0,
    },
  });

  const student2 = await prisma.student.create({
    data: {
      documentId: '1098765432',
      fullName: 'Natalia Cárdenas Ruiz',
      phone: '3123334455',
      email: 'natalia.cardenas@gmail.com',
      programName: 'Master en Colorimetría y Alisados Orgánicos',
      fingerprintTemplate: 'FP_EST_02',
      isBlocked: true,
      blockReason: 'Multa pendiente por inasistencia ($40.000 COP) y clase sin reprogramar',
      pendingBalanceCop: 120000,
    },
  });

  const student3 = await prisma.student.create({
    data: {
      documentId: '1098765433',
      fullName: 'Juliana Vargas Mejía',
      phone: '3154445566',
      email: 'juliana.vargas@gmail.com',
      programName: 'Especialización en Diseño de Uñas Acrílicas y Polygel',
      fingerprintTemplate: 'FP_EST_03',
      isBlocked: false,
      pendingBalanceCop: 0,
    },
  });

  // Clases programadas
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0);
  const afternoonStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0);
  const afternoonEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0);

  const schedule1 = await prisma.classSchedule.create({
    data: {
      roomId: room1.id,
      teacherId: teacher2.id,
      title: 'Práctica de Balayage y Corrección de Color',
      courseName: 'Colorimetría Avanzada',
      startTime: todayStart,
      endTime: todayEnd,
      maxStudents: 15,
      notes: 'Traer kit de decoloración y guantes de nitrilo.',
    },
  });

  const schedule2 = await prisma.classSchedule.create({
    data: {
      roomId: room2.id,
      teacherId: teacher1.id,
      title: 'Limpieza Facial Profunda y Punta de Diamante',
      courseName: 'Cosmetología Integral',
      startTime: afternoonStart,
      endTime: afternoonEnd,
      maxStudents: 12,
      notes: 'Práctica con modelo real.',
    },
  });

  const schedule3 = await prisma.classSchedule.create({
    data: {
      roomId: room3.id,
      teacherId: teacher1.id,
      title: 'Estructuras Acrílicas, Encapsulado y Polygel',
      courseName: 'Nail Art Profesional',
      startTime: todayStart,
      endTime: todayEnd,
      maxStudents: 18,
      notes: 'Traer lámpara UV/LED y pincel Kolinsky #8.',
    },
  });

  await prisma.studentEnrollment.createMany({
    data: [
      { scheduleId: schedule1.id, studentId: student1.id },
      { scheduleId: schedule1.id, studentId: student2.id },
      { scheduleId: schedule2.id, studentId: student1.id },
      { scheduleId: schedule2.id, studentId: student3.id },
      { scheduleId: schedule3.id, studentId: student3.id },
    ],
  });

  // Multa activa de $40.000 COP para estudiante 2
  const attendanceAbsent = await prisma.attendance.create({
    data: {
      studentId: student2.id,
      scheduleId: schedule1.id,
      status: 'AUSENTE',
      verifiedByBiometry: false,
      notes: 'Inasistencia sin excusa médica previa.',
    },
  });

  await prisma.fine.create({
    data: {
      studentId: student2.id,
      attendanceId: attendanceAbsent.id,
      missedScheduleId: schedule1.id,
      amountCop: 40000,
      status: 'PENDIENTE',
      isClassRescheduled: false,
      reason: 'Multa obligatoria por inasistencia ($40.000 COP)',
    },
  });

  // Logs quincenales de personal de planta
  await prisma.staffTimeLog.createMany({
    data: [
      {
        staffId: teacher1.id,
        checkInAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 8, 0),
        checkOutAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 16, 30),
        workedMinutes: 510,
        workedHoursDecimal: 8.5,
        verifiedByBiometry: true,
        fortnightKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getDate() <= 15 ? 'Q1' : 'Q2'}`,
      },
      {
        staffId: teacher2.id,
        checkInAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 9, 0),
        checkOutAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 17, 0),
        workedMinutes: 480,
        workedHoursDecimal: 8.0,
        verifiedByBiometry: true,
        fortnightKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getDate() <= 15 ? 'Q1' : 'Q2'}`,
      },
    ],
  });

  // Productos (con stock < 20 para disparar la alerta obligatoria)
  await prisma.product.createMany({
    data: [
      {
        barcode: '770100100101',
        sku: 'EPB-KIT-ACR',
        name: 'Kit Profesional Acrílico & Monómero Organic EPB',
        category: 'Uñas y Nail Art',
        priceCop: 145000,
        costCop: 85000,
        stock: 12, // < 20 -> Alerta crítica activa
        minStock: 20,
      },
      {
        barcode: '770100100102',
        sku: 'EPB-DEC-9T',
        name: 'Polvo Decolorante Azul 9 Tonos Ultra Plex 500g',
        category: 'Colorimetría',
        priceCop: 78000,
        costCop: 45000,
        stock: 8, // < 20 -> Alerta crítica activa
        minStock: 20,
      },
      {
        barcode: '770100100103',
        sku: 'EPB-UNIF-ROS',
        name: 'Uniforme Antifluidos Rosa Pastel EPB (Talla M)',
        category: 'Dotación Académica',
        priceCop: 110000,
        costCop: 62000,
        stock: 35,
        minStock: 20,
      },
      {
        barcode: '770100100104',
        sku: 'EPB-LASH-KIT',
        name: 'Kit Lifting y Extensión de Pestañas Pelo a Pelo',
        category: 'Estética Facial',
        priceCop: 165000,
        costCop: 92000,
        stock: 15, // < 20 -> Alerta crítica activa
        minStock: 20,
      },
    ],
  });

  // Preventas de ejemplo para mostrar la regla de 3 días, 4to día y 24h
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const fourDaysAgo = new Date(now.getTime() - 4.2 * 24 * 60 * 60 * 1000);

  await prisma.clientPresale.create({
    data: {
      clientDocument: '1055889900',
      clientName: 'Carolina Mendoza (Protegida 3 Días)',
      clientPhone: '3109998877',
      clientEmail: 'carolina@gmail.com',
      interestedCourseOrItem: 'Matrícula Cosmetología + Kit Inicial',
      status: 'PROTEGIDO_3_DIAS',
      initialSellerId: sellerA.id,
      initialAttentionAt: oneDayAgo,
      protectedUntilDay3: new Date(oneDayAgo.getTime() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.clientPresale.create({
    data: {
      clientDocument: '1055889911',
      clientName: 'Paola Andrea Jiménez (Día 4 - Liberada)',
      clientPhone: '3147776655',
      clientEmail: 'paola@gmail.com',
      interestedCourseOrItem: 'Curso de Colorimetría + Kit Decolorante',
      status: 'LIBERADO_DIA_4',
      initialSellerId: sellerA.id,
      initialAttentionAt: fourDaysAgo,
      protectedUntilDay3: new Date(fourDaysAgo.getTime() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  // Auditoría inicial
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'CREATE',
      entity: 'User',
      entityId: sellerB.id,
      newData: { info: 'Inicialización del sistema EPB y reglas de auditoría activas' },
    },
  });
}
