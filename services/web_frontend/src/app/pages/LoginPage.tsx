import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../../store/useAppStore';
import { checkSso } from '../../api/auth';
import './LoginPage.css';

export function LoginPage() {
  const [samAccount, setSamAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const { login, fetchMe, isAuthenticated } = useAppStore();

  // Тихая проверка Kerberos SSO при загрузке страницы.
  // Бэкенд НЕ возвращает WWW-Authenticate: Negotiate, поэтому
  // браузер не показывает системный попап — просто получаем 401
  // и показываем форму входа.
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
      return;
    }

    const trySso = async () => {
      try {
        await checkSso();
        // Если SSO успешно — обновляем профиль и переходим на главную
        await fetchMe();
        navigate('/');
      } catch {
        // SSO не сработал (нет Kerberos-токена или не домен) — показываем форму
      }
    };

    trySso();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const success = await login(samAccount, password);
    if (success) {
      setIsSuccess(true);
      setTimeout(() => navigate('/'), 800);
    } else {
      setError('Неверный логин или пароль. Используйте данные вашей учётной записи Windows.');
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      (
        <motion.div
          key="login"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="login-page-wrapper"
        >
          {/* ════════ LEFT: BRANDING ════════ */}
          <div className="brand-panel animate-fade-in">
            {/* Шапка с логотипом */}
            <div className="brand-header">
              <img src="/GK_logo.png" alt="ТЭМПО" className="brand-logo-img" />
            </div>

            {/* Центральный контент */}
            <div className="brand-content">
              <h1 className="brand-headline">Ваши коллеги</h1>
              <div className="brand-headline-sub">Всегда на связи</div>
              <div className="brand-divider"></div>
              <p className="brand-description">
                Справочная система для быстрого и лёгкого поиска контактов внутри холдинга.
              </p>
            </div>

            {/* Подвал */}
            <div className="brand-bottom">
              <div className="brand-bottom-text">© 2026 Холдинг · ТЭМПО</div>
            </div>
          </div>

          {/* ════════ RIGHT: FORM ════════ */}
          <div className="form-panel">
            <div className="form-eyebrow animate-fade-up-1">— Авторизация</div>
            <h2 className="form-title animate-fade-up-2">Добро пожаловать</h2>
            <p className="form-subtitle animate-fade-up-3">Используйте данные вашей рабочей учётной записи Windows</p>

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group animate-fade-up-4">
                <label className="form-label" htmlFor="login">Логин</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="login"
                    className="form-input"
                    placeholder="Например, belikov.a.a"
                    autoComplete="username"
                    value={samAccount}
                    onChange={(e) => setSamAccount(e.target.value)}
                    required
                  />
                  <div className="input-line"></div>
                </div>
              </div>

              <div className="form-group animate-fade-up-5">
                <label className="form-label" htmlFor="password">Пароль</label>
                <div className="input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    className="form-input"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <div className="input-line"></div>
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 'Скрыть' : 'Показать'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="form-error visible animate-fade-up-5">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-submit animate-fade-up-6 relative overflow-hidden"
                disabled={isSubmitting || isSuccess}
                style={{ background: isSuccess ? 'var(--brand-dark)' : '' }}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={isSuccess ? 'success' : isSubmitting ? 'submitting' : 'idle'}
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -30, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="flex items-center justify-center w-full"
                  >
                    {isSuccess ? 'Успешно' : isSubmitting ? 'Авторизация...' : 'Войти в справочник'}
                  </motion.span>
                </AnimatePresence>
              </button>
            </form>

            <div className="form-footer animate-fade-up-6" style={{ animationDelay: '0.5s' }}>
              <a href="#">Обратиться в техническую поддержку</a>
            </div>


          </div>
        </motion.div>
      )
    </AnimatePresence>
  );
}
