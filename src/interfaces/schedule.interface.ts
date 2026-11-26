export type ScheduleRepeatMode = 'SINGLE' | 'DAILY_3' | 'DAILY_5' | 'WEEKLY_4';

export interface RoomItem {
  id: string;
  name: string;
  code: string;
  capacity: number;
  description: string | null;
  isActive: boolean;
  activeSchedulesCount?: number;
}

export interface CreateRoomPayload {
  name: string;
  code: string;
  capacity: number;
  description?: string;
}

export interface UpdateRoomPayload {
  roomId: string;
  name: string;
  capacity: number;
  description?: string;
}

export interface EnrolledStudentSummary {
  id: string;
  documentId: string;
  fullName: string;
  isBlocked: boolean;
  attendanceStatus?: 'PRESENTE' | 'AUSENTE' | 'REPROGRAMADO' | null;
}

export interface ClassScheduleItem {
  id: string;
  roomId: string;
  roomName: string;
  teacherId: string;
  teacherName: string;
  title: string;
  courseName: string;
  startTime: string;
  endTime: string;
  maxStudents: number;
  enrolledCount: number;
  enrolledStudents: EnrolledStudentSummary[];
  notes: string | null;
  isActive?: boolean;
  deactivationReason?: string | null;
  deactivatedByName?: string | null;
  deactivatedAt?: string | null;
}

export interface CreateSchedulePayload {
  roomId: string;
  teacherId: string;
  title: string;
  courseName: string;
  startTime: string;
  endTime: string;
  maxStudents: number;
  studentIds: string[];
  notes?: string;
  repeatMode?: ScheduleRepeatMode;
}

export interface UpdateSchedulePayload {
  scheduleId: string;
  roomId: string;
  teacherId: string;
  title: string;
  courseName: string;
  startTime: string;
  endTime: string;
  maxStudents: number;
  studentIds: string[];
  notes?: string;
  isActive?: boolean;
  deactivationReason?: string | null;
}
