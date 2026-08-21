import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { ShieldCheck, CheckCircle2, Edit3, Clock, LogOut, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { toast } from 'sonner';

export const GatekeeperModal: React.FC = () => {
  const { currentUser, logout, acknowledgeGatekeeper } = useAppStore(
    useShallow((state) => ({
      currentUser: state.currentUser,
      logout: state.logout,
      acknowledgeGatekeeper: state.acknowledgeGatekeeper,
    })),
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSessionDismissed, setIsSessionDismissed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isProfilePage = location.pathname.startsWith('/profile');

  // Hard block if no grace period left
  const isHardBlock = Boolean(currentUser && !currentUser.is_verified && currentUser.grace_period_left <= 0);

  useEffect(() => {
    if (!currentUser?.id) {
      setIsSessionDismissed(false);
      return;
    }
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const dismissed = window.sessionStorage.getItem(`gatekeeper_dismissed_${currentUser.id}`) === 'true';
      setIsSessionDismissed(dismissed);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser || currentUser.is_verified || isProfilePage) {
      setIsOpen(false);
      return;
    }

    if (isHardBlock) {
      setIsOpen(true);
    } else if (!isSessionDismissed) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [currentUser, isProfilePage, isSessionDismissed, isHardBlock]);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    const res = await acknowledgeGatekeeper('confirm');
    setIsSubmitting(false);
    if (res.success) {
      toast.success('Контакты подтверждены');
      setIsOpen(false);
    } else {
      toast.error(res.error || 'Не удалось подтвердить контакты');
    }
  };

  const handleGoToProfile = () => {
    if (currentUser?.id && typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(`gatekeeper_dismissed_${currentUser.id}`, 'true');
      setIsSessionDismissed(true);
    }
    setIsOpen(false);
    if (currentUser) {
      navigate(`/profile/${currentUser.id}`);
    }
  };

  const handleRemindLater = async () => {
    if (currentUser?.id && typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(`gatekeeper_dismissed_${currentUser.id}`, 'true');
      setIsSessionDismissed(true);
    }
    setIsSubmitting(true);
    await acknowledgeGatekeeper('skip');
    setIsSubmitting(false);
    setIsOpen(false);
    toast.info('Напоминание отложено');
  };

  if (!isOpen || !currentUser || isProfilePage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-7 max-w-md w-full border border-[#d6e3ee] overflow-hidden">
        <div className="flex flex-col items-center text-center">
          <div className="bg-primary/10 text-primary p-4 rounded-2xl mb-4 ring-8 ring-primary/5">
            <ShieldCheck className="w-9 h-9" strokeWidth={1.75} />
          </div>
          
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Проверка контактных данных
          </h2>
          
          <p className="text-sm text-slate-600 mb-5 leading-relaxed">
            Пожалуйста, проверьте актуальность ваших контактных данных для телефонного справочника.
            {currentUser.grace_period_left > 0 ? (
              <span className="block mt-2 font-medium text-amber-600 text-xs">
                Осталось дней для подтверждения: {currentUser.grace_period_left}
              </span>
            ) : (
              <span className="block mt-2 font-semibold text-rose-600 text-xs">
                Период подтверждения истёк. Пожалуйста, подтвердите контакты.
              </span>
            )}
          </p>
          
          <div className="flex flex-col w-full gap-2.5">
            {/* Confirm button */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirm}
              className="btn-primary w-full py-2.5 px-4 text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-primary/20"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Всё верно, подтвердить</span>
            </button>

            {/* Go to profile button */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleGoToProfile}
              className="btn-secondary w-full py-2.5 px-4 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              <span>Проверить и изменить</span>
            </button>
            
            {/* Remind later or logout */}
            {!isHardBlock ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleRemindLater}
                className="w-full py-2 px-4 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center gap-1.5 mt-1"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Напомнить позже</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => logout()}
                className="flex items-center justify-center gap-2 w-full py-2 px-4 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-medium mt-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Выйти из системы</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
