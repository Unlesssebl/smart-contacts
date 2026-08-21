import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  BookOpen,
  Search,
  Phone,
  Edit,
  HelpCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Command,
  User,
  MousePointer,
  RotateCcw,
  Zap,
} from 'lucide-react';

interface UserGuidesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'tour' | 'catalog';
  onOpenSupport?: () => void;
}

type GuideTopic = 'search' | 'cards' | 'edit' | 'support';

interface GuideSection {
  id: GuideTopic;
  title: string;
  shortDesc: string;
  icon: typeof Search;
  badge: string;
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'search',
    title: 'Быстрый поиск и фильтры',
    shortDesc: 'Поиск по ФИО, внутреннему номеру, должности и быстрые клавиши',
    icon: Search,
    badge: 'Поиск',
  },
  {
    id: 'cards',
    title: 'Карточки и быстрые звонки',
    shortDesc: 'Звонки в 1 клик, копирование номеров и онлайн-статусы',
    icon: Phone,
    badge: 'Контакты',
  },
  {
    id: 'edit',
    title: 'Исправление контактов',
    shortDesc: 'Редактирование своего профиля и исправление данных коллег',
    icon: Edit,
    badge: 'Актуализация',
  },
  {
    id: 'support',
    title: 'Техническая поддержка',
    shortDesc: 'Обращения к IT-службе при проблемах с доступом или данными',
    icon: HelpCircle,
    badge: 'Помощь',
  },
];

const TOUR_STEPS = [
  {
    title: 'Мгновенный умный поиск',
    subtitle: 'Находите нужного коллегу за долю секунды',
    icon: Search,
    badge: 'Шаг 1 из 4',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          В поисковую строку можно вводить любую известную информацию: <strong>ФИО</strong>, <strong>внутренний короткий номер</strong> (например, <em>20-40</em> или <em>2040</em>), <strong>должность</strong>, <strong>отдел</strong> или <strong>кабинет</strong>.
        </p>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wider">
            <Zap className="h-4 w-4 text-blue-600" />
            <span>Горячая клавиша для профи</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-700">
            <div className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 font-mono font-bold shadow-sm">
              <Command className="h-3 w-3" />
              <span>Ctrl + K</span>
            </div>
            <span>или просто начните печатать в любом месте экрана — фокус сразу перейдет в поиск!</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Удобные карточки сотрудников',
    subtitle: 'Вся важная информация и статусы присутствия',
    icon: Phone,
    badge: 'Шаг 2 из 4',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Каждая карточка содержит актуальные телефоны, адрес подразделения и кабинет.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5 shadow-sm">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-primary" /> Звонок и копирование
            </div>
            <p className="text-slate-500">
              Кликните на номер телефона, чтобы скопировать его или инициировать вызов.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5 shadow-sm">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> Индикаторы онлайн
            </div>
            <p className="text-slate-500">
              Цветной маркер на аватаре подскажет, на рабочем ли месте коллега прямо сейчас.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Исправление неверных данных',
    subtitle: 'Поддерживайте контакты компании в идеальном порядке',
    icon: Edit,
    badge: 'Шаг 3 из 4',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Заметили ошибку в номере или кабинете коллеги? Вам не нужно писать длинные письма в IT.
        </p>

        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span>Кнопка «Исправить» прямо на карточке</span>
          </div>
          <p className="text-xs text-indigo-900 leading-relaxed">
            Наведите курсор на карточку сотрудника и нажмите кнопку <strong>«Исправить»</strong>. Укажите правильные данные — и заявка сразу поступит модераторам на согласование.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: 'Поддержка и обратная связь',
    subtitle: 'IT-служба всегда на связи',
    icon: HelpCircle,
    badge: 'Шаг 4 из 4',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Если у вас возникли технические неполадки, проблемы со входом или предложения по развитию справочника — воспользуйтесь формой поддержки.
        </p>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-950 space-y-1">
            <div className="font-bold">Быстрая подача обращения</div>
            <p className="text-emerald-900 leading-relaxed">
              Кнопка «Написать в поддержку» доступна в левом меню, а также на странице входа, если у вас возникли сложности с доступом.
            </p>
          </div>
        </div>
      </div>
    ),
  },
];

export function UserGuidesModal({
  isOpen,
  onClose,
  initialMode = 'tour',
  onOpenSupport,
}: UserGuidesModalProps) {
  const [mode, setMode] = useState<'tour' | 'catalog'>(initialMode);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTopic, setActiveTopic] = useState<GuideTopic>('search');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setCurrentStep(0);
    }
  }, [isOpen, initialMode]);

  // Lock scroll
  useEffect(() => {
    if (!isOpen) return;
    const viewport = document.querySelector('[data-overlayscrollbars-viewport]') as HTMLElement;
    if (viewport) viewport.style.overflow = 'hidden';
    return () => {
      if (viewport) viewport.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (mode === 'tour') {
        if (e.key === 'ArrowRight' && currentStep < TOUR_STEPS.length - 1) {
          setCurrentStep((s) => s + 1);
        } else if (e.key === 'ArrowLeft' && currentStep > 0) {
          setCurrentStep((s) => s - 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mode, currentStep, onClose]);

  if (!isOpen) return null;

  const handleFinishTour = () => {
    localStorage.setItem('smart_contacts_onboarding_completed', 'true');
    onClose();
  };

  const handleStartTour = () => {
    setCurrentStep(0);
    setMode('tour');
  };

  const currentTourStep = TOUR_STEPS[currentStep];
  const StepIcon = currentTourStep.icon;

  const modalContent = (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm"
      />

      {/* Modal Dialog */}
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6 md:p-8 pointer-events-none">
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.96, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 14 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative w-full max-w-3xl overflow-hidden glass-card p-0 pointer-events-auto shadow-2xl flex flex-col max-h-[90vh] border border-white/50 bg-white/95 backdrop-blur-xl"
        >
          {/* Top Bar / Header */}
          <div className="flex items-center justify-between border-b border-black/5 px-6 py-4.5 bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {mode === 'tour' ? 'Знакомство со справочником' : 'Руководство пользователя'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {mode === 'tour'
                    ? 'Короткий интерактивный обзор ключевых возможностей'
                    : 'Лаконичные инструкции по работе с системой'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {mode === 'catalog' ? (
                <button
                  type="button"
                  onClick={handleStartTour}
                  className="hidden sm:flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Вводный тур</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode('catalog')}
                  className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                  <span>Все гайды</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Mode Switcher for Mobile */}
          <div className="flex sm:hidden border-b border-black/5 bg-slate-100/60 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => setMode('tour')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg text-center transition ${
                mode === 'tour' ? 'bg-white text-primary shadow-sm' : 'text-slate-600'
              }`}
            >
              Вводный тур
            </button>
            <button
              type="button"
              onClick={() => setMode('catalog')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg text-center transition ${
                mode === 'catalog' ? 'bg-white text-primary shadow-sm' : 'text-slate-600'
              }`}
            >
              Все гайды
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 sm:p-8 overflow-y-auto flex-1">
            <AnimatePresence mode="wait">
              {mode === 'tour' ? (
                /* TOUR MODE */
                <motion.div
                  key={`tour-step-${currentStep}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Step Header */}
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-sm ring-1 ring-primary/20">
                      <StepIcon className="h-6 w-6" strokeWidth={2} />
                    </div>
                    <div>
                      <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary mb-1">
                        {currentTourStep.badge}
                      </span>
                      <h3 className="text-xl font-bold text-foreground tracking-tight">
                        {currentTourStep.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {currentTourStep.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Step Content */}
                  <div className="pt-2">{currentTourStep.content}</div>
                </motion.div>
              ) : (
                /* CATALOG MODE (Concise Guides) */
                <motion.div
                  key="catalog-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* Category Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {GUIDE_SECTIONS.map((sec) => {
                      const Icon = sec.icon;
                      const isActive = activeTopic === sec.id;
                      return (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => setActiveTopic(sec.id)}
                          className={`flex items-center gap-2 rounded-xl p-2.5 px-3 text-left transition ${
                            isActive
                              ? 'bg-primary text-white shadow-md shadow-primary/20'
                              : 'bg-slate-50 border border-black/5 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="text-xs font-semibold truncate">{sec.badge}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Topic Content */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                    {activeTopic === 'search' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-primary font-bold text-base">
                          <Search className="h-5 w-5" />
                          <span>Как эффективно искать сотрудников</span>
                        </div>
                        <ul className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
                          <li className="flex items-start gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
                              1
                            </span>
                            <span>
                              <strong>По короткому номеру</strong>: введите <code>20-40</code> или <code>2040</code>, чтобы мгновенно найти владельца внутреннего телефона.
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
                              2
                            </span>
                            <span>
                              <strong>По части ФИО или опечатке</strong>: умный алгоритм нечеткого поиска (fuzzy search) найдет сотрудника, даже если вы допустили ошибку в одной букве.
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
                              3
                            </span>
                            <span>
                              <strong>Фильтры по организациям</strong>: используйте панель подразделений слева для просмотра сотрудников конкретного завода или дирекции.
                            </span>
                          </li>
                        </ul>
                      </div>
                    )}

                    {activeTopic === 'cards' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-primary font-bold text-base">
                          <Phone className="h-5 w-5" />
                          <span>Работа с карточками и онлайн-статусы</span>
                        </div>
                        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-1">
                            <div className="font-semibold text-slate-900">Индикация присутствия:</div>
                            <div className="flex flex-wrap gap-3 pt-1">
                              <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> В сети
                              </span>
                              <span className="flex items-center gap-1.5 font-medium text-amber-700">
                                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Отошёл (неактивен 5+ мин)
                              </span>
                              <span className="flex items-center gap-1.5 font-medium text-slate-500">
                                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Не в сети
                              </span>
                            </div>
                          </div>
                          <p>
                            Кликнув по карточке, вы откроете полное окно профиля с историей изменений и расширенными данными.
                          </p>
                        </div>
                      </div>
                    )}

                    {activeTopic === 'edit' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-primary font-bold text-base">
                          <Edit className="h-5 w-5" />
                          <span>Редактирование профиля и исправление контактов</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 space-y-2">
                            <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                              <User className="h-4 w-4 text-indigo-600" /> Свой профиль
                            </div>
                            <p className="text-slate-600 leading-relaxed">
                              Перейдите в пункт «Мой профиль» в левом меню. Вы можете обновить свой внутренний и мобильный номер, кабинет и выбрать персонализированный цвет аватара.
                            </p>
                          </div>

                          <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3.5 space-y-2">
                            <div className="font-bold text-purple-950 flex items-center gap-1.5">
                              <MousePointer className="h-4 w-4 text-purple-600" /> Контакты коллег
                            </div>
                            <p className="text-slate-600 leading-relaxed">
                              Наведите курсор на карточку коллеги и нажмите кнопку <strong>«Исправить»</strong>. Предложенные изменения поступят модераторам для подтверждения.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTopic === 'support' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-primary font-bold text-base">
                          <HelpCircle className="h-5 w-5" />
                          <span>Техническая поддержка и обращения</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Если вы столкнулись с ошибкой входа, не видите свое подразделение или хотите предложить функцию для развития справочника — отправьте обращение в службу поддержки.
                        </p>
                        {onOpenSupport && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenSupport();
                            }}
                            className="btn-primary px-4 py-2 text-xs font-semibold shadow-sm"
                          >
                            Написать в поддержку прямо сейчас
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Navigation / Footer */}
          {mode === 'tour' ? (
            <div className="border-t border-black/5 p-4 px-6 sm:px-8 bg-slate-50/70 shrink-0 flex items-center justify-between">
              {/* Dots Progress */}
              <div className="flex items-center gap-1.5">
                {TOUR_STEPS.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentStep(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentStep
                        ? 'w-6 bg-primary'
                        : 'w-2 bg-slate-300 hover:bg-slate-400'
                    }`}
                    aria-label={`Шаг ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center gap-2.5">
                {currentStep > 0 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((s) => s - 1)}
                    className="btn-secondary flex items-center gap-1 px-3.5 py-2 text-xs font-medium"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Назад</span>
                  </button>
                )}

                {currentStep < TOUR_STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((s) => s + 1)}
                    className="btn-primary flex items-center gap-1.5 px-5 py-2 text-xs font-semibold shadow-md shadow-primary/20"
                  >
                    <span>Далее</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinishTour}
                    className="btn-primary flex items-center gap-1.5 px-6 py-2 text-xs font-bold shadow-md shadow-primary/20"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Начать работу</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="border-t border-black/5 p-4 px-6 sm:px-8 bg-slate-50/70 shrink-0 flex items-center justify-between">
              <button
                type="button"
                onClick={handleStartTour}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Пройти вводный тур</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="btn-primary px-6 py-2 text-xs font-semibold"
              >
                Понятно
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
