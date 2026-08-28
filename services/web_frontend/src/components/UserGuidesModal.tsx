import { useState, useEffect, useCallback } from 'react';
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
  User,
  MousePointer,
  RotateCcw,
  SlidersHorizontal,
  Check,
  Building,
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
    shortDesc: 'Поиск по ФИО и телефонам, фильтрация по организации, отделу и должности',
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

function SearchTourSimulation() {
  return (
    <div className="relative rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 p-4 sm:p-5 shadow-sm overflow-hidden">
      {/* Mockup Search Bar */}
      <div className="relative rounded-xl border border-slate-300 bg-white p-3 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <Search className="h-4 w-4 text-primary shrink-0" />
          <div className="flex items-center text-xs font-medium text-slate-800">
            <motion.span
              animate={{ opacity: [1, 1, 1, 1, 0.4, 1] }}
              transition={{ duration: 3.2, repeat: Infinity }}
            >
              Иванов 20-40
            </motion.span>
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="inline-block w-0.5 h-3.5 bg-primary ml-0.5"
            />
          </div>
        </div>

        {/* Animated Filters Button with Cursor */}
        <div className="relative shrink-0">
          <div className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Фильтры</span>
          </div>

          {/* Animated Mouse Pointer */}
          <motion.div
            animate={{
              x: [18, 0, 0, 18],
              y: [18, 2, 2, 18],
              scale: [1, 0.88, 1, 1],
            }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -bottom-3 -right-2 text-primary drop-shadow z-10"
          >
            <MousePointer className="h-4.5 w-4.5 fill-primary text-white" />
          </motion.div>
        </div>
      </div>

      {/* Mockup Filter Dropdown Reveal */}
      <motion.div
        animate={{
          opacity: [0.35, 1, 1, 0.35],
          y: [3, 0, 0, 3],
        }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        className="mt-2.5 rounded-xl border border-slate-200 bg-white/90 backdrop-blur-sm p-2.5 shadow-sm grid grid-cols-3 gap-2 text-[11px]"
      >
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-1.5 text-slate-600">
          <div className="text-[10px] text-slate-400 font-medium">Организация</div>
          <div className="font-semibold text-slate-800 truncate">АО НТЗ ТЭМ-ПО</div>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-1.5 text-slate-600">
          <div className="text-[10px] text-slate-400 font-medium">Отдел</div>
          <div className="font-semibold text-slate-800 truncate">ИТ отдел</div>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-1.5 text-slate-600">
          <div className="text-[10px] text-slate-400 font-medium">Должность</div>
          <div className="font-semibold text-slate-800 truncate">Инженер</div>
        </div>
      </motion.div>
    </div>
  );
}

function CardTourSimulation() {
  return (
    <div className="relative rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-emerald-50/20 to-blue-50/30 p-4 sm:p-5 shadow-sm overflow-hidden">
      <div className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-md max-w-md mx-auto">
        {/* Top Org Badge & Presence */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
            АО НТЗ ТЭМ-ПО
          </span>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>В сети</span>
          </div>
        </div>

        {/* User Details */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 font-bold text-primary text-sm shadow-sm ring-1 ring-primary/20">
            СА
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-slate-900 text-xs truncate">Смирнова Анна Сергеевна</div>
            <div className="text-[11px] text-slate-500 truncate">Бухгалтерия • Ведущий бухгалтер</div>
          </div>
        </div>

        {/* Interactive Phone Pill with Copy Animation */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="relative">
            <motion.div
              animate={{
                scale: [1, 1.04, 1, 1],
              }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary shadow-xs"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>вн. 20-40</span>
            </motion.div>

            {/* Simulated Tooltip */}
            <motion.div
              animate={{
                opacity: [0, 1, 1, 0],
                y: [4, -2, -2, 4],
              }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-7 left-0 rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white shadow-md flex items-center gap-1 whitespace-nowrap"
            >
              <Check className="h-2.5 w-2.5 text-emerald-400" />
              <span>Скопировано!</span>
            </motion.div>

            {/* Mouse pointer clicking phone */}
            <motion.div
              animate={{
                x: [14, 4, 4, 14],
                y: [14, 2, 2, 14],
                scale: [1, 0.85, 1, 1],
              }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -bottom-3 -right-2 text-primary drop-shadow z-10"
            >
              <MousePointer className="h-4.5 w-4.5 fill-primary text-white" />
            </motion.div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <Building className="h-3 w-3 text-slate-400" />
            <span>Кабинет 304</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditTourSimulation() {
  return (
    <div className="relative rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 via-purple-50/50 to-blue-50/70 p-4 sm:p-5 shadow-sm overflow-hidden">
      <div className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-md max-w-md mx-auto">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-bold text-sm">
              ИП
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Иванов Петр Николаевич</div>
              <div className="text-[11px] text-slate-500">Служба снабжения</div>
            </div>
          </div>

          {/* Action button with pulse glow and pointer */}
          <div className="relative">
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary shadow-sm ring-4 ring-primary/20"
            >
              <Edit className="h-3 w-3" />
              <span>Исправить</span>
            </motion.div>

            <motion.div
              animate={{ y: [0, 4, 0], x: [0, -3, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -bottom-4 -right-1 text-primary drop-shadow z-10"
            >
              <MousePointer className="h-4.5 w-4.5 fill-primary text-white" />
            </motion.div>
          </div>
        </div>

        {/* Modal Request Notification Preview */}
        <motion.div
          animate={{
            opacity: [0.4, 1, 1, 0.4],
            y: [3, 0, 0, 3],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="mt-3.5 rounded-lg border border-indigo-100 bg-indigo-50/70 p-2.5 flex items-center justify-between text-[11px]"
        >
          <div className="flex items-center gap-1.5 text-indigo-950 font-medium">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <span>Заявка на изменение номера / кабинета</span>
          </div>
          <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded shadow-2xs">
            Модерация IT
          </span>
        </motion.div>
      </div>
    </div>
  );
}

function SupportTourSimulation() {
  return (
    <div className="relative rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-blue-50/70 p-4 sm:p-5 shadow-sm overflow-hidden">
      <div className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-md max-w-md mx-auto space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <HelpCircle className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Служба поддержки</div>
              <div className="text-[10px] text-slate-500">Кнопка «Помощь» в боковом меню</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700">
            <span>Техподдержка</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-slate-700 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Проблема со входом</span>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-slate-700 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Ошибка в контактах</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const TOUR_STEPS = [
  {
    title: 'Мгновенный умный поиск',
    subtitle: 'Находите нужного коллегу за долю секунды',
    icon: Search,
    badge: 'Шаг 1 из 4',
    content: (
      <div className="space-y-4">
        {/* GIF-like Interactive Simulation */}
        <SearchTourSimulation />

        <div className="space-y-2 text-xs text-slate-600 leading-relaxed pt-1">
          <p>
            • <strong>Поисковая строка</strong>: вводите <strong>ФИО</strong> (с исправлением опечаток) или <strong>номер телефона</strong> (короткий внутренний <em>20-40</em> или мобильный).
          </p>
          <p>
            • <strong>Кнопка «Фильтры»</strong>: позволяет отобрать сотрудников по <strong>организации</strong>, <strong>отделу</strong> или <strong>должности</strong>.
          </p>
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
        {/* GIF-like Interactive Simulation */}
        <CardTourSimulation />

        <div className="space-y-2 text-xs text-slate-600 leading-relaxed pt-1">
          <p>
            • <strong>Быстрые действия</strong>: нажмите на номер телефона, чтобы скопировать его в буфер обмена или начать вызов.
          </p>
          <p>
            • <strong>Индикатор онлайн</strong>: цветной маркер на аватаре подскажет, на рабочем ли месте коллега прямо сейчас (в сети, отошёл или не в сети).
          </p>
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
        {/* GIF-like Interactive Simulation */}
        <EditTourSimulation />

        <div className="space-y-2 text-xs text-slate-600 leading-relaxed pt-1">
          <p>
            • Нажмите кнопку <strong>«Исправить»</strong> на карточке любого коллеги, укажите верный номер или кабинет — и заявка отправится на проверку в IT.
          </p>
          <p>
            • Свой собственный профиль вы можете обновить на странице <strong>«Мой профиль»</strong>.
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
        {/* GIF-like Interactive Simulation */}
        <SupportTourSimulation />

        <div className="space-y-2 text-xs text-slate-600 leading-relaxed pt-1">
          <p>
            • Если у вас возникли сложности с доступом, технический сбой или идея по развитию — нажмите кнопку <strong>«Помощь»</strong> в меню слева (или на экране входа).
          </p>
          <p>
            • Обращение напрямую поступает специалистам службы технической поддержки.
          </p>
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

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem('smart_contacts_onboarding_completed', 'true');
    } catch {
      // ignore
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss();
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
  }, [isOpen, mode, currentStep, handleDismiss]);

  if (!isOpen) return null;

  const handleFinishTour = () => {
    handleDismiss();
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
        onClick={handleDismiss}
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
                onClick={handleDismiss}
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
                              <strong>По короткому или мобильному номеру</strong>: введите <code>20-40</code>, <code>2040</code> или мобильный номер, чтобы быстро найти сотрудника.
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
                              2
                            </span>
                            <span>
                              <strong>По ФИО или части имени</strong>: умный алгоритм нечеткого поиска найдет сотрудника, даже если допущена опечатка.
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
                              3
                            </span>
                            <span>
                              <strong>Панель фильтров</strong>: нажмите «Фильтры», чтобы отсортировать по организации, отделу, должности или отобрать только контакты с телефоном/email.
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
                              handleDismiss();
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
                onClick={handleDismiss}
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
