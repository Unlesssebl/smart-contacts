import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Send,
  CheckCircle2,
  KeyRound,
  FileEdit,
  AlertCircle,
  Lightbulb,
  HelpCircle,
  User as UserIcon,
  Phone,
  Mail,
  Edit,
  ArrowRight,
  Sparkles,
  MousePointer,
  Building,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { SupportCategory } from '@/types';

interface SupportModalProps {
  onClose: () => void;
  isGuest?: boolean;
}

interface CategoryOption {
  value: SupportCategory;
  label: string;
  description: string;
  icon: typeof KeyRound;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    value: 'access',
    label: 'Проблема с доступом',
    description: 'Не удается войти в систему или нет прав',
    icon: KeyRound,
  },
  {
    value: 'data_error',
    label: 'Ошибка в контактах',
    description: 'Неверные данные сотрудника или подразделения',
    icon: FileEdit,
  },
  {
    value: 'bug',
    label: 'Технический сбой',
    description: 'Что-то не работает или отображается с ошибкой',
    icon: AlertCircle,
  },
  {
    value: 'suggestion',
    label: 'Идея / улучшение',
    description: 'Предложение по развитию телефонного справочника',
    icon: Lightbulb,
  },
  {
    value: 'other',
    label: 'Другой вопрос',
    description: 'Общий вопрос к технической поддержке',
    icon: HelpCircle,
  },
];

export function SupportModal({ onClose, isGuest = false }: SupportModalProps) {
  const navigate = useNavigate();
  const currentUser = useAppStore((state) => state.currentUser);
  const sendSupportTicket = useAppStore((state) => state.sendSupportTicket);

  const [category, setCategory] = useState<SupportCategory>('access');
  const [message, setMessage] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderContact, setSenderContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveIsGuest = isGuest || !currentUser;

  // Prevent background scroll while modal is open
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

  const handleNavigateToDirectory = () => {
    onClose();
    if (!effectiveIsGuest) {
      navigate('/');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!message.trim()) {
      setError('Пожалуйста, опишите вашу проблему или вопрос');
      return;
    }

    if (effectiveIsGuest) {
      if (!senderName.trim()) {
        setError('Пожалуйста, укажите ваше имя');
        return;
      }
      if (!senderContact.trim()) {
        setError('Пожалуйста, укажите контакт для связи (телефон, email или логин)');
        return;
      }
    }

    setIsSubmitting(true);
    const result = await sendSupportTicket({
      category,
      message: message.trim(),
      sender_name: effectiveIsGuest ? senderName.trim() : undefined,
      sender_contact: effectiveIsGuest ? senderContact.trim() : undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      setIsSubmitted(true);
    } else {
      setError(result.error || 'Произошла ошибка при отправке обращения');
    }
  };

  const modalContent = (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
      />

      {/* Modal dialog */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 md:p-8 pointer-events-none">
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative w-full max-w-3xl overflow-hidden glass-card p-0 pointer-events-auto shadow-2xl flex flex-col max-h-[92vh] border border-white/40 bg-white/95 backdrop-blur-xl"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 z-10 rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>

          <AnimatePresence mode="wait">
            {isSubmitted ? (
              /* Success screen */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center p-10 py-16 text-center"
              >
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-12 ring-emerald-50/60">
                  <CheckCircle2 className="h-10 w-10" strokeWidth={2} />
                </div>
                <h3 className="text-2xl font-bold text-foreground">Спасибо за обращение!</h3>
                <p className="mt-3 max-w-lg text-base text-muted-foreground leading-relaxed">
                  Ваше сообщение успешно принято технической поддержкой. Если потребуется уточнить детали, оператор свяжется с вами.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-primary mt-8 px-8 py-3 text-base font-semibold shadow-lg shadow-primary/20"
                >
                  Понятно
                </button>
              </motion.div>
            ) : (
              /* Form */
              <form key="form" onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className="border-b border-black/5 px-8 py-6 shrink-0 bg-slate-50/60">
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">
                    Обращение в техническую поддержку
                  </h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Опишите возникшую проблему или задайте вопрос специалистам IT-службы
                  </p>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto space-y-6">
                  {/* Sender info preview / input */}
                  {effectiveIsGuest ? (
                    <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                        <UserIcon className="h-4 w-4 text-blue-600" />
                        <span>Контактные данные для связи</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Ваше ФИО <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={senderName}
                            onChange={(e) => setSenderName(e.target.value)}
                            placeholder="Иванов Иван Иванович"
                            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Телефон или Email <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={senderContact}
                            onChange={(e) => setSenderContact(e.target.value)}
                            placeholder="+7 (999) 000-00-00 или email"
                            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-slate-50/80 px-5 py-4 text-xs text-muted-foreground shadow-sm">
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-base">
                          {currentUser?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-foreground">{currentUser?.full_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {currentUser?.department || 'Сотрудник'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-xs space-y-0.5">
                        {currentUser?.internal_phone && (
                          <div className="flex items-center gap-1.5 text-slate-700 justify-end font-medium">
                            <Phone className="h-3.5 w-3.5 text-slate-400" /> вн. {currentUser.internal_phone}
                          </div>
                        )}
                        {currentUser?.email && (
                          <div className="flex items-center gap-1.5 text-slate-700 justify-end font-medium">
                            <Mail className="h-3.5 w-3.5 text-slate-400" /> {currentUser.email}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Category picker */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                      Категория проблемы
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {CATEGORY_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = category === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setCategory(opt.value)}
                            className={`flex items-start gap-3.5 rounded-2xl border p-4 text-left transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/[0.06] shadow-sm ring-2 ring-primary/30'
                                : 'border-black/5 bg-white hover:border-black/15 hover:bg-slate-50/70'
                            }`}
                          >
                            <div
                              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                                isSelected ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <div className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                {opt.label}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                {opt.description}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Data Error Interactive Visual Guide */}
                  <AnimatePresence>
                    {category === 'data_error' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, scale: 0.98 }}
                        animate={{ opacity: 1, height: 'auto', scale: 1 }}
                        exit={{ opacity: 0, height: 0, scale: 0.98 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="overflow-hidden"
                      >
                        <div className="rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 via-purple-50/50 to-blue-50/70 p-6 shadow-sm">
                          {/* Guide Banner Header */}
                          <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm mb-3">
                            <Sparkles className="h-5 w-5 text-indigo-600 shrink-0" />
                            <span>Знали ли вы? Исправить контакты можно прямо на карточке сотрудника!</span>
                          </div>

                          <p className="text-xs text-indigo-950/80 leading-relaxed mb-5">
                            Вам не обязательно писать обращение вручную. Вы можете нажать кнопку <strong>«Исправить»</strong> на карточке любого коллеги или в своем профиле — и форма исправления откроется автоматически.
                          </p>

                          {/* Visual Demonstration Mockup Card */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center mb-5">
                            {/* Left: Mini Card Preview */}
                            <div className="md:col-span-6">
                              <div className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-md overflow-hidden">
                                {/* Simulated Card Top */}
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-bold text-sm">
                                      СА
                                    </div>
                                    <div>
                                      <div className="text-xs font-bold text-slate-900">Смирнова Анна С.</div>
                                      <div className="text-[11px] text-slate-500">Бухгалтерия</div>
                                    </div>
                                  </div>

                                  {/* Simulated Action Button with Pulse Glow */}
                                  <div className="relative">
                                    <div className="flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary shadow-sm animate-pulse ring-4 ring-primary/20">
                                      <Edit className="h-3 w-3" />
                                      <span>Исправить</span>
                                    </div>
                                    {/* Animated Pointer Icon */}
                                    <motion.div
                                      animate={{ y: [0, 4, 0], x: [0, -3, 0] }}
                                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                                      className="absolute -bottom-4 -right-1 text-primary drop-shadow"
                                    >
                                      <MousePointer className="h-5 w-5 fill-primary text-white" />
                                    </motion.div>
                                  </div>
                                </div>

                                {/* Simulated Card Contacts */}
                                <div className="mt-3.5 space-y-1.5 border-t border-slate-100 pt-2.5 text-[11px] text-slate-600">
                                  <div className="flex items-center gap-1.5">
                                    <Phone className="h-3 w-3 text-slate-400" />
                                    <span>вн. 20-40</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Building className="h-3 w-3 text-slate-400" />
                                    <span>Офис 402</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Right: Step-by-step points */}
                            <div className="md:col-span-6 space-y-2.5 text-xs text-indigo-950">
                              <div className="flex items-start gap-2.5">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-200 text-indigo-800 font-bold text-[11px]">
                                  1
                                </span>
                                <span className="leading-snug">
                                  Найдите сотрудника через поиск в Справочнике
                                </span>
                              </div>
                              <div className="flex items-start gap-2.5">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-200 text-indigo-800 font-bold text-[11px]">
                                  2
                                </span>
                                <span className="leading-snug">
                                  Наведите на карточку и нажмите кнопку <strong>«Исправить»</strong>
                                </span>
                              </div>
                              <div className="flex items-start gap-2.5">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-200 text-indigo-800 font-bold text-[11px]">
                                  3
                                </span>
                                <span className="leading-snug">
                                  Введите актуальный номер, кабинет или отдел
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action button inside guide */}
                          {!effectiveIsGuest && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-indigo-200/60">
                              <span className="text-xs text-indigo-800 font-medium">
                                Хотите сразу перейти к поиску сотрудника?
                              </span>
                              <button
                                type="button"
                                onClick={handleNavigateToDirectory}
                                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-semibold shadow-sm transition-all hover:shadow"
                              >
                                <span>Перейти в Справочник</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Message textarea */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Описание проблемы <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-xs text-muted-foreground">{message.length} / 5000</span>
                    </div>
                    <textarea
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Опишите, что произошло, укажите детали (ФИО, подразделение, ошибку), чтобы специалисты могли быстро вам помочь..."
                      className="w-full resize-none rounded-2xl border border-black/10 bg-white p-4 text-sm text-foreground leading-relaxed outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50 min-h-[130px]"
                    />
                  </div>

                  {/* Error display */}
                  {error && (
                    <div className="rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-700 border border-rose-200 flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-black/5 p-5 px-8 bg-slate-50/60 shrink-0 flex items-center justify-end gap-3.5">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="btn-secondary px-5 py-2.5 text-sm font-medium"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`btn-primary flex items-center gap-2 px-6 py-2.5 text-sm font-semibold shadow-md shadow-primary/20 ${
                      isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <Send className="h-4 w-4" />
                    <span>{isSubmitting ? 'Отправка...' : 'Отправить обращение'}</span>
                  </button>
                </div>
              </form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
