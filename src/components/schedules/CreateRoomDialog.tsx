'use client';

import React, { useState } from 'react';
import { DoorOpen, Users, X } from 'lucide-react';
import { CreateRoomPayload } from '@/interfaces/schedule.interface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateRoomDialogProps {
  onClose: () => void;
  onSubmit: (payload: CreateRoomPayload) => Promise<void>;
}

const QUICK_CAPACITIES = [8, 10, 12, 15, 18, 20, 25];

export function CreateRoomDialog({ onClose, onSubmit }: CreateRoomDialogProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [capacity, setCapacity] = useState<number>(15);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!name.trim() || !code.trim() || capacity <= 0) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        capacity,
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error creando salón físico'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white text-[#141213] shadow-2xl dark:border-[#3A3035] dark:bg-[#181517] dark:text-[#F5EEF1]">
        <div className="flex items-center justify-between gap-3 border-b border-[#E4BDD0]/80 bg-gradient-to-r from-[#ECCCD9]/60 to-[#FAF2F6] px-4 py-3.5 sm:px-5 dark:border-[#332B2F] dark:from-[#261F23] dark:to-[#1B1719]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#141213] text-[#ECCCD9] dark:bg-[#ECCCD9] dark:text-[#141213]">
              <DoorOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-serif text-base sm:text-lg font-bold text-[#141213] dark:text-[#F5EEF1]">
                Crear Nuevo Salón Físico
              </h2>
              <p className="truncate text-xs text-neutral-600 dark:text-[#C4B5BC]">
                Defina nombre, código único y capacidad máxima de personas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-white/15 dark:bg-[#252023] dark:text-neutral-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-5">
          {errorMsg && (
            <div className="rounded-xl border border-red-400/60 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-900 dark:border-red-500/40 dark:bg-red-950/60 dark:text-red-200">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
              Nombre del Salón *
            </Label>
            <Input
              placeholder="Ej: Salón 104 - Maquillaje Profesional & Novias"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#211C1F] dark:text-white"
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                Código del Salón *
              </Label>
              <Input
                placeholder="Ej: SALON-104"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="font-mono font-bold border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#211C1F] dark:text-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                <Users className="h-3.5 w-3.5" />
                Capacidad Máxima (Personas) *
              </Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="font-extrabold border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#211C1F] dark:text-white"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-neutral-600 dark:text-[#C4B5BC]">
              Selección Rápida de Capacidad (Tocadores / Camillas / Mesas):
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_CAPACITIES.map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => setCapacity(cap)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${
                    capacity === cap
                      ? 'border-[#141213] bg-[#141213] text-[#ECCCD9] dark:border-[#ECCCD9] dark:bg-[#ECCCD9] dark:text-[#141213]'
                      : 'border-neutral-300 bg-[#FAF7F9] text-[#141213] hover:bg-[#ECCCD9] dark:border-[#3A3035] dark:bg-[#211C1F] dark:text-[#E5D8DF]'
                  }`}
                >
                  {cap} personas
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
              Equipamiento / Descripción del Salón
            </Label>
            <Input
              placeholder="Ej: 15 estaciones con espejo LED y sillas hidráulicas"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#211C1F] dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-neutral-200 pt-3 dark:border-[#332B2F]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="dark:border-[#3A3035] dark:bg-[#221D20] dark:text-neutral-200"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="pink"
              disabled={isSubmitting}
              className="bg-[#ECCCD9] font-extrabold text-[#141213] hover:bg-[#E4BDD0]"
            >
              {isSubmitting ? 'Creando Salón...' : 'Guardar Salón'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
