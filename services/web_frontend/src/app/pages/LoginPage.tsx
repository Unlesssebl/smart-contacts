import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { checkSso } from '../../api/auth';
import './LoginPage.css';

export function LoginPage() {
  const [samAccount, setSamAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSsoChecking, setIsSsoChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const { login, setAuth, isAuthenticated } = useAppStore();

  useEffect(() => {
    const performSso = async () => {
      if (isAuthenticated) {
        navigate('/');
        return;
      }

      try {
        const data = await checkSso();
        if (data && data.access_token) {
          // Map API user to Frontend User type
          const mappedUser = {
            id: data.user.id,
            full_name: data.user.full_name,
            sam_account: data.user.sam_account_name,
            role: data.user.role,
            // Fallback for other fields
            job_title: data.user.job_title || 'Employee',
            department: data.user.department || 'General',
            email: data.user.email || `${data.user.sam_account_name}@company.com`,
            is_online: true,
            internal_phone: data.user.internal_phone || '',
            mobile_phone: data.user.mobile_phone || ''
          };

          setAuth(mappedUser, data.access_token);
          navigate('/');
        }
      } catch (err) {
        console.log('SSO not available or failed, showing login form');
      } finally {
        setIsSsoChecking(false);
      }
    };

    performSso();
  }, [isAuthenticated, navigate, setAuth]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Simulate network delay for the smooth animation
    setTimeout(() => {
      const success = login(samAccount, password);
      if (success) {
        setIsSuccess(true);
        setTimeout(() => navigate('/'), 800);
      } else {
        setError('Неверные учетные данные. Попробуйте: jive, cfederighi, sprescott...');
        setIsSubmitting(false);
      }
    }, 1200);
  };

  return (
    <AnimatePresence mode="wait">
      {isSsoChecking ? (
        <div key="loader" className="flex min-h-screen items-center justify-center bg-gray-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="flex flex-col items-center gap-4 p-12 bg-white rounded-xl shadow-sm border border-gray-100"
          >
            <Loader2 className="h-10 w-10 animate-spin text-[#1a3f6f]" />
            <p className="text-lg font-medium text-gray-900">Проверка безопасного доступа...</p>
          </motion.div>
        </div>
      ) : (
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
              <div className="brand-bottom-text">ТЭМПО · Холдинг</div>
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
                className="btn-submit animate-fade-up-6"
                disabled={isSubmitting || isSuccess}
                style={{ background: isSuccess ? '#0e2444' : '' }}
              >
                <span>
                  {isSuccess ? 'Успешно' : isSubmitting ? 'Авторизация...' : 'Войти в справочник'}
                </span>
                <span className="arrow" style={{ opacity: isSubmitting && !isSuccess ? 0 : 1 }}>
                  {isSuccess ? '✓' : '→'}
                </span>
              </button>
            </form>

            <div className="form-footer animate-fade-up-6" style={{ animationDelay: '0.5s' }}>
              <a href="#">Обратиться в техническую поддержку</a>
            </div>

            {/* Demo Hint */}
            <div className="absolute top-6 right-6 max-w-xs rounded bg-gray-50/80 p-3 border border-gray-200 shadow-sm opacity-50 hover:opacity-100 transition-opacity">
              <p className="text-[10px] text-gray-500 leading-tight">
                <strong>Демо:</strong> Используйте любую SAM УЗ (напр. "jive", "cfederighi") с любым паролем.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
