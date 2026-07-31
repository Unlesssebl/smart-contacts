import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X, Trash2 } from 'lucide-react';
import { IMaskInput } from 'react-imask';
import type { User } from '@/types';
import { useAppStore } from '@/store/useAppStore';

interface ReportModalProps {
  user: User;
  onClose: () => void;
}

interface ReportFieldOption {
  value: 'mobile_phone' | 'internal_phone' | 'job_title' | 'department' | 'office_location';
  label: string;
  mask?: string;
  placeholder?: string;
}

const FIELD_OPTIONS: readonly ReportFieldOption[] = [
  { value: 'mobile_phone', label: 'Мобильный телефон', mask: '+7 000 000 00 00', placeholder: '+7 999 800 70 70' },
  { value: 'internal_phone', label: 'Внутренний телефон', mask: '00-00', placeholder: '20-20' },
  { value: 'job_title', label: 'Должность' },
  { value: 'department', label: 'Отдел' },
  { value: 'office_location', label: 'Офис' }
] as const;

export function ReportModal({ user, onClose }: ReportModalProps) {
  // State holds proposed values for each field. undefined = unchanged, null = delete
  const [proposedValues, setProposedValues] = useState<Record<string, string | null>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addReport = useAppStore((state) => state.addReport);

  const getCurrentValue = (fieldKey: string) => {
    const val = user[fieldKey as keyof User];
    if (val === null || val === undefined || val === '' || val === '[]') {
      return '';
    }
    return String(val);
  };

  const displayCurrentValue = (fieldKey: string) => {
    const val = getCurrentValue(fieldKey);
    return val ? val : 'Не указано';
  };

  const handleValueChange = (fieldKey: string, value: string) => {
    setProposedValues(prev => ({ ...prev, [fieldKey]: value }));
    setError(null);
  };

  const handleMarkToDelete = (fieldKey: string) => {
    setProposedValues(prev => ({ ...prev, [fieldKey]: null }));
    setError(null);
  };

  // Prevent scroll when modal is open
  useEffect(() => {
    const viewport = document.querySelector('[data-overlayscrollbars-viewport]') as HTMLElement;
    if (viewport) viewport.style.overflow = 'hidden';
    return () => {
      if (viewport) viewport.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async () => {
    setError(null);

    const changes: { attribute_name: string; new_value: string | null }[] = [];

    FIELD_OPTIONS.forEach(field => {
      const currentVal = getCurrentValue(field.value);
      const proposedVal = proposedValues[field.value];

      if (proposedVal !== undefined) {
        if (proposedVal === null) {
          if (currentVal !== '') {
            changes.push({ attribute_name: field.value, new_value: null });
          }
        } else if (proposedVal.trim() !== currentVal) {
          changes.push({ attribute_name: field.value, new_value: proposedVal.trim() });
        }
      }
    });

    if (changes.length === 0) {
      setError('Вы не предложили ни одного изменения. Введите новые данные или нажмите на корзину, чтобы предложить удалить данные.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addReport({
        target_user_id: user.id,
        changes
      });
      onClose(); // Success, close modal
    } catch {
      // errors handled by useAppStore (toasts)
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
      >
        <motion.div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-3xl overflow-hidden glass-card p-0 pointer-events-auto shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="relative border-b border-black/5 px-6 py-5 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="absolute right-5 top-5 rounded-full p-2 transition-colors hover:bg-black/5"
            >
              <X className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            </button>
            <h2 className="text-xl font-semibold text-foreground">Предложить исправление</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Актуализация данных для {user.full_name}
            </p>
          </div>

          {/* Content - Scrollable */}
          <div className="p-6 overflow-y-auto bg-slate-50/30">
            <div className="space-y-4">
              {FIELD_OPTIONS.map((field) => {
                const currentVal = getCurrentValue(field.value);
                const proposedVal = proposedValues[field.value];
                const isDeleted = proposedVal === null;
                const isChanged = proposedVal !== undefined && proposedVal !== null && proposedVal.trim() !== currentVal;
                const displayVal = proposedVal ?? '';

                return (
                  <div key={field.value} className={`rounded-xl border p-4 transition-colors ${isDeleted ? 'border-rose-200 bg-rose-50/50' : isChanged ? 'border-primary/30 bg-primary/5' : 'border-black/5 bg-white'}`}>
                    <div className="flex flex-col md:flex-row md:items-center gap-4">

                      {/* Left: Info */}
                      <div className="w-full md:w-1/2 shrink-0">
                        <div className="flex items-center gap-2 mb-1">
                          <label className="text-sm font-medium text-foreground">{field.label}</label>
                          {isChanged && !isDeleted && <span className="text-[10px] uppercase font-bold text-primary tracking-wider px-1.5 py-0.5 rounded-sm bg-primary/10">Изменено</span>}
                          {isDeleted && <span className="text-[10px] uppercase font-bold text-rose-600 tracking-wider px-1.5 py-0.5 rounded-sm bg-rose-100">Удаление</span>}
                        </div>
                        <div className={`text-sm ${isDeleted ? 'text-muted-foreground line-through opacity-70' : 'text-muted-foreground'}`}>
                          {displayCurrentValue(field.value)}
                        </div>
                      </div>

                      {/* Right: Input */}
                      <div className="w-full md:w-1/2 flex items-center gap-2">
                        {isDeleted ? (
                          <div className="flex-1 h-[42px] px-3 flex items-center rounded-lg border border-rose-200/50 bg-white/50 text-rose-600 text-sm font-medium">
                            Данные будут удалены
                          </div>
                        ) : field.mask ? (
                          <IMaskInput
                            mask={field.mask}
                            value={displayVal}
                            unmask={false}
                            onAccept={(value: string) => handleValueChange(field.value, value)}
                            placeholder={field.placeholder ?? ''}
                            className="flex-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40"
                          />
                        ) : (
                          <input
                            type="text"
                            value={displayVal}
                            onChange={(e) => handleValueChange(field.value, e.target.value)}
                            placeholder="Введите новое значение..."
                            className="flex-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40"
                          />
                        )}

                        {/* Clear/Delete Button */}
                        {!isDeleted && currentVal && (
                          <button
                            onClick={() => handleMarkToDelete(field.value)}
                            title="Предложить удалить эти данные"
                            className="p-2.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100 shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        {/* Undo Delete Button */}
                        {isDeleted && (
                          <button
                            onClick={() => handleValueChange(field.value, '')}
                            title="Отменить удаление"
                            className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200 shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}

              {error && (
                <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-600 border border-red-100 flex items-center justify-center text-center">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-black/5 p-6 bg-white shrink-0 flex justify-end gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              disabled={isSubmitting}
              className="btn-secondary px-5 py-2.5 text-sm"
            >
              Отмена
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`btn-primary px-6 py-2.5 text-sm ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? 'Отправка...' : 'Отправить'}
            </button>
          </div>

        </motion.div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
