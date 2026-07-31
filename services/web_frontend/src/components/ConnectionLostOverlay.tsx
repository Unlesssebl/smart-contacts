import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

const DISPLAY_DELAY_MS = 1500;

export function ConnectionLostOverlay() {
  const isApiDown = useAppStore((state) => state.isApiDown);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isApiDown) {
      setIsVisible(false);
      return;
    }

    const timer = window.setTimeout(() => setIsVisible(true), DISPLAY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [isApiDown]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-500 dark:bg-red-500/20">
          <WifiOff className="h-8 w-8" />
        </div>
        <h2 className="mb-3 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Соединение потеряно
        </h2>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Сервер временно недоступен или выполняется обновление. Мы пытаемся восстановить связь…
        </p>
        <div className="flex items-center justify-center space-x-2" aria-label="Повторное подключение">
          <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.3s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.15s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500" />
        </div>
      </div>
    </div>
  );
}
