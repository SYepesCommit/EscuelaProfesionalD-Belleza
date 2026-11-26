import {
  ClassScheduleItem,
  CreateRoomPayload,
  CreateSchedulePayload,
  RoomItem,
  UpdateRoomPayload,
  UpdateSchedulePayload,
} from '@/interfaces/schedule.interface';

export async function fetchRooms(): Promise<RoomItem[]> {
  const res = await fetch('/api/rooms', { cache: 'no-store' });
  if (!res.ok) throw new Error('Error cargando salones');
  return (await res.json()) as RoomItem[];
}

export async function createRoomRequest(
  payload: CreateRoomPayload & { operatorUserId: string }
): Promise<RoomItem> {
  const res = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error creando salón');
  }
  return (await res.json()) as RoomItem;
}

export async function updateRoomRequest(
  payload: UpdateRoomPayload & { operatorUserId: string }
): Promise<void> {
  const res = await fetch('/api/rooms', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error actualizando salón');
  }
}

export async function deleteRoomRequest(params: {
  roomId: string;
  operatorUserId: string;
}): Promise<void> {
  const res = await fetch('/api/rooms', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error eliminando salón');
  }
}

export async function fetchSchedules(
  roomId?: string
): Promise<ClassScheduleItem[]> {
  const query = roomId ? `?roomId=${encodeURIComponent(roomId)}` : '';
  const res = await fetch(`/api/schedules${query}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Error cargando agendas');
  return (await res.json()) as ClassScheduleItem[];
}

export async function createScheduleRequest(
  payload: CreateSchedulePayload & { operatorUserId: string }
): Promise<void> {
  const res = await fetch('/api/schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error creando horario');
  }
}

export async function updateScheduleRequest(
  payload: UpdateSchedulePayload & { operatorUserId: string }
): Promise<void> {
  const res = await fetch('/api/schedules', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error actualizando clase');
  }
}

export async function deleteScheduleRequest(params: {
  scheduleId: string;
  operatorUserId: string;
}): Promise<void> {
  const res = await fetch('/api/schedules', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error eliminando clase');
  }
}
