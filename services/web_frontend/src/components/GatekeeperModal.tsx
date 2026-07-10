import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router';

export const GatekeeperModal: React.FC = () => {
  const { currentUser, logout } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser && !currentUser.is_verified) {
      if (currentUser.grace_period_left > 0) {
        setIsOpen(true);
      } else {
        // Hard block - they cannot skip it. In this UI we just force them to verify.
        setIsOpen(true);
      }
    } else {
      setIsOpen(false);
    }
  }, [currentUser]);

  if (!isOpen || !currentUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-blue-500/30">
        <div className="flex flex-col items-center text-center">
          <div className="bg-blue-100 dark:bg-blue-900/50 p-4 rounded-full mb-4">
            <ShieldAlert className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Актуализация контактов
          </h2>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Пожалуйста, проверьте актуальность ваших контактных данных в профиле. Это необходимо для корректной работы корпоративного справочника.
            {currentUser.grace_period_left > 0 && (
              <span className="block mt-2 font-medium text-amber-600 dark:text-amber-400">
                Осталось дней для подтверждения: {currentUser.grace_period_left}
              </span>
            )}
          </p>
          
          <div className="flex flex-col w-full gap-3">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate(`/profile/${currentUser.id}`);
              }}
              className="btn-primary w-full py-2.5 px-4"
            >
              <CheckCircle className="w-5 h-5" />
              Перейти к проверке
            </button>
            
            {currentUser.grace_period_left > 0 ? (
              <button
                onClick={() => setIsOpen(false)}
                className="btn-secondary w-full py-2.5 px-4"
              >
                Напомнить позже
              </button>
            ) : (
              <button
                onClick={() => logout()}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg transition-colors font-medium"
              >
                <XCircle className="w-5 h-5" />
                Выйти
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
