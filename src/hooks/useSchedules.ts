'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ClassScheduleItem,
  CreateRoomPayload,
  CreateSchedulePayload,
  RoomItem,
  UpdateRoomPayload,
  UpdateSchedulePayload,
} from '@/interfaces/schedule.interface';
import {
  createRoomRequest,
  createScheduleRequest,
  deleteRoomRequest,
  deleteScheduleRequest,
  fetchRooms,
  fetchSchedules,
  updateRoomRequest,
  updateScheduleRequest,
} from '@/services/schedule.service';

export function useSchedules() {
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [allSchedules, setAllSchedules] = useState<ClassScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const roomsData = await fetchRooms();
      const schedulesData = await fetchSchedules();
      setRooms(roomsData);
      setAllSchedules(schedulesData);
    } catch (err) {
      if (!isBackground) {
        setError(err instanceof Error ? err.message : 'Error cargando agendas');
      }
    } finally {
      if (!isBackground) {
        setIsLoading(false);
      }
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Actualización bajo demanda cuando el usuario pulsa "Actualizar Datos" en la barra superior
  useEffect(() => {
    const handleManualRefresh = () => {
      void loadData(true);
    };

    window.addEventListener('epb:manual-refresh', handleManualRefresh);
    return () => {
      window.removeEventListener('epb:manual-refresh', handleManualRefresh);
    };
  }, [loadData]);

  const schedules = useMemo(() => {
    if (!selectedRoomId) return allSchedules;
    return allSchedules.filter((s) => s.roomId === selectedRoomId);
  }, [allSchedules, selectedRoomId]);

  const createSchedule = useCallback(
    async (payload: CreateSchedulePayload & { operatorUserId: string }) => {
      await createScheduleRequest(payload);
      await loadData();
    },
    [loadData]
  );

  const updateSchedule = useCallback(
    async (payload: UpdateSchedulePayload & { operatorUserId: string }) => {
      await updateScheduleRequest(payload);
      await loadData();
    },
    [loadData]
  );

  const deleteSchedule = useCallback(
    async (params: { scheduleId: string; operatorUserId: string }) => {
      await deleteScheduleRequest(params);
      await loadData();
    },
    [loadData]
  );

  const createRoom = useCallback(
    async (payload: CreateRoomPayload & { operatorUserId: string }) => {
      const created = await createRoomRequest(payload);
      await loadData();
      return created;
    },
    [loadData]
  );

  const updateRoom = useCallback(
    async (payload: UpdateRoomPayload & { operatorUserId: string }) => {
      await updateRoomRequest(payload);
      await loadData();
    },
    [loadData]
  );

  const deleteRoom = useCallback(
    async (params: { roomId: string; operatorUserId: string }) => {
      await deleteRoomRequest(params);
      setSelectedRoomId('');
      await loadData();
    },
    [loadData]
  );

  return {
    rooms,
    selectedRoomId,
    setSelectedRoomId,
    schedules,
    allSchedules,
    isLoading,
    error,
    reloadSchedules: loadData,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    createRoom,
    updateRoom,
    deleteRoom,
  };
}
