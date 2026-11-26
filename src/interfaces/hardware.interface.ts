export type FingerprintEventType =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'CAPTURE_SUCCESS'
  | 'MATCH_FOUND'
  | 'ERROR';

export interface FingerprintWsMessage {
  event: FingerprintEventType;
  template?: string;
  matchedUserId?: string;
  matchedStudentId?: string;
  confidence?: number;
  errorMessage?: string;
  timestamp: string;
}

export interface FingerprintReaderState {
  isConnected: boolean;
  isScanning: boolean;
  lastEvent: FingerprintEventType | null;
  lastTemplate: string | null;
  matchedEntityId: string | null;
  error: string | null;
}

export interface BarcodeScanEvent {
  barcode: string;
  scannedAt: string;
}
