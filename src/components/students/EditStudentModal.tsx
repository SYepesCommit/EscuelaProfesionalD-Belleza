'use client';

import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  CheckCircle2,
  X,
  CreditCard,
  User,
  Phone,
  Mail,
  GraduationCap,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudentItem } from '@/interfaces/student.interface';

interface EditStudentModalProps {
  isOpen: boolean;
  student: StudentItem | null;
  onClose: () => void;
  onSubmit: (payload: {
    studentId: string;
    documentId: string;
    fullName: string;
    phone: string;
    email?: string;
    programName: string;
    pendingBalanceCop: number;
    pendingBalanceReason?: string;
  }) => Promise<void>;
}

export function EditStudentModal({
  isOpen,
  student,
  onClose,
  onSubmit,
}: EditStudentModalProps) {
  const [documentId, setDocumentId] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedProgramOption, setSelectedProgramOption] = useState('');
  const [customProgramName, setCustomProgramName] = useState('');
  const [pendingBalanceCop, setPendingBalanceCop] = useState(0);
  const [pendingBalanceReason, setPendingBalanceReason] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const STANDARD_PROGRAMS = [
    'Cosmetología Integral',
    'Colorimetría Avanzada',
    'Nail Art Profesional & Acrílicos',
    'Estilismo y Barbería',
    'Micropigmentación & Cejas',
    'Maquillaje Profesional & Social',
    'Lifting, Pestañas Pelo a Pelo & Cejas',
  ];

  useEffect(() => {
    if (student) {
      setDocumentId(student.documentId);
      setFullName(student.fullName);
      setPhone(student.phone);
      setEmail(student.email ?? '');
      if (STANDARD_PROGRAMS.includes(student.programName)) {
        setSelectedProgramOption(student.programName);
        setCustomProgramName('');
      } else {
        setSelectedProgramOption('__CUSTOM__');
        setCustomProgramName(student.programName);
      }
      setPendingBalanceCop(student.pendingBalanceCop);
      setPendingBalanceReason(student.pendingBalanceReason ?? '');
      setErrorMessage(null);
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const resolvedProgram =
    selectedProgramOption === '__CUSTOM__'
      ? customProgramName.trim()
      : selectedProgramOption.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy(true);
    setErrorMessage(null);

    if (selectedProgramOption === '__CUSTOM__' && !customProgramName.trim()) {
      setErrorMessage('Por favor ingrese el nombre del programa académico');
      setIsBusy(false);
      return;
    }

    try {
      await onSubmit({
        studentId: student.id,
        documentId: documentId.trim(),
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        programName: resolvedProgram,
        pendingBalanceCop: Number(pendingBalanceCop) || 0,
        pendingBalanceReason: pendingBalanceReason.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Error al actualizar estudiante'
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 sm:p-6 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-3xl border border-[#ECCCD9] dark:border-white/10 bg-white dark:bg-[#1E1D1D] shadow-2xl overflow-hidden">
        {/* Header Elegante */}
        <div className="relative border-b border-neutral-100 dark:border-white/5 bg-gradient-to-r from-[#F9EFF3] via-[#FAF1F5] to-white dark:from-[#252324] dark:to-[#1E1D1D] px-7 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#232222] dark:bg-[#ECCCD9] text-[#ECCCD9] dark:text-[#141213] shadow-sm">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-[#1A1A1A] dark:text-neutral-100">
                  Editar Datos de la Alumna
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Actualice la información académica, financiera o de contacto
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#141213] text-neutral-400 hover:text-black dark:hover:text-white transition"
              title="Cerrar ventana"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Formulario Estilizado */}
        <form onSubmit={handleSubmit} className="p-7 space-y-5">
          {errorMessage && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Documento */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-neutral-400" />
                <span>Documento de Identidad (C.C. / T.I.)</span>
              </label>
              <input
                required
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                placeholder="Ej: 1098765431"
                className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50/50 dark:bg-[#141213] px-3.5 py-2.5 text-xs text-[#1A1A1A] dark:text-neutral-100 outline-none transition focus:border-[#232222] dark:focus:border-[#ECCCD9] focus:bg-white dark:focus:bg-[#1A1919] focus:ring-1 focus:ring-[#232222]"
              />
            </div>

            {/* Nombre Completo */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-neutral-400" />
                <span>Nombre Completo</span>
              </label>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej: Daniela Ospina Pérez"
                className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50/50 dark:bg-[#141213] px-3.5 py-2.5 text-xs text-[#1A1A1A] dark:text-neutral-100 outline-none transition focus:border-[#232222] dark:focus:border-[#ECCCD9] focus:bg-white dark:focus:bg-[#1A1919] focus:ring-1 focus:ring-[#232222]"
              />
            </div>

            {/* Teléfono */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-neutral-400" />
                <span>Teléfono Móvil</span>
              </label>
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: 3112223344"
                className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50/50 dark:bg-[#141213] px-3.5 py-2.5 text-xs text-[#1A1A1A] dark:text-neutral-100 outline-none transition focus:border-[#232222] dark:focus:border-[#ECCCD9] focus:bg-white dark:focus:bg-[#1A1919] focus:ring-1 focus:ring-[#232222]"
              />
            </div>

            {/* Correo Electrónico */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-neutral-400" />
                <span>Correo Electrónico (Opcional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alumna@gmail.com"
                className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50/50 dark:bg-[#141213] px-3.5 py-2.5 text-xs text-[#1A1A1A] dark:text-neutral-100 outline-none transition focus:border-[#232222] dark:focus:border-[#ECCCD9] focus:bg-white dark:focus:bg-[#1A1919] focus:ring-1 focus:ring-[#232222]"
              />
            </div>
          </div>

          {/* Programa Académico */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-neutral-400" />
                <span>Programa Académico *</span>
              </span>
              <span className="text-[10px] text-neutral-400">
                Seleccione o personalice
              </span>
            </label>
            <div className="relative">
              <select
                className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50/50 dark:bg-[#141213] px-3.5 py-2.5 text-xs font-semibold text-[#1A1A1A] dark:text-neutral-100 outline-none transition focus:border-[#232222] dark:focus:border-[#ECCCD9] focus:bg-white dark:focus:bg-[#1A1919]"
                value={selectedProgramOption}
                onChange={(e) => setSelectedProgramOption(e.target.value)}
              >
                <optgroup label="Programas Técnicos Oficiales EPB">
                  <option value="Cosmetología Integral">Cosmetología Integral</option>
                  <option value="Colorimetría Avanzada">Colorimetría Avanzada</option>
                  <option value="Nail Art Profesional & Acrílicos">Nail Art Profesional & Acrílicos</option>
                  <option value="Estilismo y Barbería">Estilismo y Barbería</option>
                  <option value="Micropigmentación & Cejas">Micropigmentación & Cejas</option>
                  <option value="Maquillaje Profesional & Social">Maquillaje Profesional & Social</option>
                  <option value="Lifting, Pestañas Pelo a Pelo & Cejas">Lifting, Pestañas Pelo a Pelo & Cejas</option>
                </optgroup>
                <optgroup label="Nuevo / Diplomado / Taller">
                  <option value="__CUSTOM__">+ Escribir otro programa nuevo...</option>
                </optgroup>
              </select>
            </div>

            {/* Input adicional si selecciona crear o editar uno personalizado */}
            {selectedProgramOption === '__CUSTOM__' && (
              <div className="animate-in fade-in duration-150 space-y-1 pt-1">
                <label className="text-[11px] font-bold text-[#7A1E46] dark:text-[#ECCCD9]">
                  Nombre del Programa Académico:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Diplomado en Peinados para Novias"
                  value={customProgramName}
                  onChange={(e) => setCustomProgramName(e.target.value)}
                  className="w-full rounded-xl border-2 border-[#D9AFC2] bg-white dark:bg-[#141213] px-3.5 py-2 text-xs font-bold text-[#141213] dark:text-white outline-none focus:border-[#7A1E46]"
                />
              </div>
            )}
          </div>

          {/* Saldo Académico */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-neutral-400" />
                <span>Saldo Académico Pendiente (COP)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-neutral-400">
                  $ COP
                </span>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={pendingBalanceCop}
                  onChange={(e) => setPendingBalanceCop(Number(e.target.value))}
                  className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50/50 dark:bg-[#141213] pl-14 pr-3.5 py-2.5 text-xs font-bold text-[#1A1A1A] dark:text-neutral-100 outline-none transition focus:border-[#232222] dark:focus:border-[#ECCCD9] focus:bg-white dark:focus:bg-[#1A1919]"
                />
              </div>
            </div>

            {/* Motivo o concepto del saldo */}
            {pendingBalanceCop > 0 && (
              <div className="space-y-1.5 animate-in fade-in duration-150">
                <label className="text-xs font-medium text-amber-800 dark:text-amber-300 flex items-center justify-between">
                  <span>Motivo o Concepto de la Deuda</span>
                  <span className="text-[10px] text-neutral-400">Aparecerá en la alerta de bloqueo</span>
                </label>
                <input
                  type="text"
                  value={pendingBalanceReason}
                  onChange={(e) => setPendingBalanceReason(e.target.value)}
                  placeholder="Ej: Pendiente cuota 3 de matrícula, saldo de kit profesional"
                  className="w-full rounded-xl border border-amber-300 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-950/20 px-3.5 py-2 text-xs text-amber-950 dark:text-amber-100 outline-none transition focus:border-amber-500 focus:bg-white dark:focus:bg-[#1A1919]"
                />
              </div>
            )}

            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Si la alumna tiene saldo pendiente por mensualidad o matrícula, este valor bloquea la emisión del certificado final.
            </p>
          </div>

          {/* Footer de Acciones */}
          <div className="mt-7 flex items-center justify-end gap-3 border-t border-neutral-100 dark:border-white/5 pt-5">
            <Button
              type="button"
              variant="outline"
              disabled={isBusy}
              onClick={onClose}
              className="rounded-xl px-5 py-2 text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="pink"
              disabled={isBusy}
              className="rounded-xl px-5 py-2 text-xs font-bold gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Guardar Cambios</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
