export type ClientProtectionStatusType =
  | 'PROTEGIDO_3_DIAS'
  | 'LIBERADO_DIA_4'
  | 'SEGUNDA_OPORTUNIDAD_24H'
  | 'LIBRE_DEFINITIVO'
  | 'VENTA_CERRADA';

export type PaymentMethodType = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MIXTO';

export interface ClientPresaleItem {
  id: string;
  clientDocument: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  interestedCourseOrItem: string;
  status: ClientProtectionStatusType;
  statusLabel: string;
  initialSellerId: string;
  initialSellerName: string;
  initialAttentionAt: string;
  protectedUntilDay3: string;
  secondSellerId: string | null;
  secondSellerName: string | null;
  secondAttentionAt: string | null;
  secondWindowUntil24h: string | null;
  effectiveCommissionSellerId: string;
  effectiveCommissionSellerName: string;
  protectionRuleExplanation: string;
  notes?: string | null;
  remainingMs?: number;
}

export interface ClaimPresalePayload {
  presaleId: string;
  sellerSecretCode: string;
  note?: string;
}

export interface UpdatePresaleNotesPayload {
  presaleId: string;
  notes: string;
}

export interface RegisterPresalePayload {
  sellerSecretCode: string;
  clientDocument: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  interestedCourseOrItem: string;
  notes?: string;
}

export interface CartSaleItem {
  productId: string;
  barcode: string;
  name: string;
  unitPriceCop: number;
  quantity: number;
  maxStock: number;
}

export interface CreateSalePayload {
  closingSellerSecretCode: string;
  clientDocument?: string;
  clientName: string;
  paymentMethod: PaymentMethodType;
  paymentAccountInfo?: string;
  discountCop?: number;
  items: {
    productId: string;
    quantity: number;
  }[];
}

export interface SaleItemDetail {
  id: string;
  productId: string;
  productName: string;
  productBarcode: string;
  quantity: number;
  unitPriceCop: number;
  subtotalCop: number;
}

export interface SaleRecordItem {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientDocument: string | null;
  closingSellerName: string;
  commissionedSellerName: string;
  protectionRuleApplied: string;
  subtotalCop: number;
  discountCop: number;
  totalCop: number;
  commissionAmountCop: number;
  paymentMethod: PaymentMethodType;
  status: 'COMPLETADA' | 'ANULADA';
  createdAt: string;
  items?: SaleItemDetail[];
}

export interface SellerMonthlyCommissionSummary {
  sellerId: string;
  sellerName: string;
  documentId: string;
  monthKey: string;
  salesCount: number;
  totalSalesCop: number;
  commissionRatePct: number;
  totalCommissionCop: number;
}

export interface MonthlyFinancialOverview {
  posSalesTotalCop: number;
  tuitionTotalCop: number;
  finesTotalCop: number;
  schoolGrossIncomeCop: number;
  salesCount: number;
  tuitionReceiptsCount: number;
  finesCount: number;
  courseBreakdown: {
    courseId: string;
    courseName: string;
    newStudentsCount: number;
    estimatedIncomeCop: number;
  }[];
  detailedAccountingMovements?: {
    date: string;
    category: string;
    referenceNumber: string;
    thirdPartyName: string;
    thirdPartyDocument: string;
    concept: string;
    paymentMethod: string;
    paymentReference: string;
    amountCop: number;
  }[];
}

export interface MonthlyReportResponse {
  monthKey: string;
  summary: SellerMonthlyCommissionSummary[];
  financialOverview?: MonthlyFinancialOverview;
}
