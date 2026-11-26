export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VOID_SALE'
  | 'DISCOUNT_APPLIED'
  | 'CASH_DRAWER_OPENED'
  | 'CASH_COUNT_REGISTERED'
  | 'DRAWER_OPEN_NO_SALE'
  | 'CASH_DRAWER_OUTFLOW'
  | 'CASH_REGISTER_Z_REPORT'
  | 'FINE_CREATED'
  | 'FINE_PAID'
  | 'FINE_CANCELLED'
  | 'STUDENT_PAYMENT_REGISTERED'
  | 'STUDENT_FINGERPRINT_ENROLLED'
  | 'STUDENT_ACCESS_DENIED'
  | 'FINE_MODIFIED'
  | 'STUDENT_BLOCKED'
  | 'STUDENT_UNBLOCKED'
  | 'CLASS_RESCHEDULED'
  | 'STOCK_ADJUSTED'
  | 'PRODUCT_PRICE_CHANGED'
  | 'STOCK_SCRAP_REGISTERED'
  | 'CERTIFICATE_ISSUED'
  | 'CERTIFICATE_BLOCKED_ATTEMPT'
  | 'CLIENT_RELEASED'
  | 'PRESALE_SELLER_TRANSFERRED'
  | 'COMMISSION_RATE_CHANGED'
  | 'STAFF_TIME_MANUALLY_ADJUSTED'
  | 'SCHEDULE_DEACTIVATED'
  | 'SCHEDULE_REACTIVATED'
  | 'HARDWARE_EMERGENCY_OVERRIDE_ACTIVATED'
  | 'HARDWARE_EMERGENCY_LOGIN';

export type AuditEntity =
  | 'User'
  | 'Room'
  | 'ClassSchedule'
  | 'Student'
  | 'StudentPayment'
  | 'Attendance'
  | 'Fine'
  | 'Certificate'
  | 'StaffTimeLog'
  | 'StaffPayrollAdjustment'
  | 'StaffFortnightSettlement'
  | 'Product'
  | 'ClientPresale'
  | 'Sale'
  | 'Commission'
  | 'CashRegister';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export interface RecordAuditParams {
  userId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  previousData?: Record<string, JsonValue> | null;
  newData?: Record<string, JsonValue> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogItem extends RecordAuditParams {
  id: string;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    role: string;
  };
}
