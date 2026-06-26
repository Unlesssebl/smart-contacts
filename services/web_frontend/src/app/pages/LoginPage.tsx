import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { checkSso } from '../../api/auth';

export function LoginPage() {
  const [samAccount, setSamAccount] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSsoChecking, setIsSsoChecking] = useState(true);
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

    const success = login(samAccount, password);
    if (success) {
      navigate('/');
    } else {
      setError('Неверные учетные данные. Попробуйте: jive, cfederighi, sprescott, jternus, dobrien или ecue');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-transparent">
      <AnimatePresence mode="wait">
        {isSsoChecking ? (
          <motion.div
            key="sso-loader"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="flex flex-col items-center gap-4 p-12 glass-card"
          >
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-lg font-medium text-foreground">Проверка безопасного доступа...</p>
          </motion.div>
        ) : (
          <motion.div
            key="login-form"
            initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-md overflow-hidden glass-card p-0"
      >
        <div className="p-10">
          {/* Logo */}
          <div className="text-center">
            <h1 className="bg-gradient-to-r from-primary to-accent bg-clip-text text-4xl font-semibold tracking-tight text-transparent">
              Crystal
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Корпоративный справочник</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Учетная запись SAM
              </label>
              <input
                type="text"
                value={samAccount}
                onChange={(e) => setSamAccount(e.target.value)}
                placeholder="Введите вашу учетную запись SAM"
                required
                className="w-full rounded-xl border border-border px-4 py-3 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-ring bg-input-background backdrop-blur-md"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите ваш пароль"
                required
                className="w-full rounded-xl border border-border px-4 py-3 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-ring bg-input-background backdrop-blur-md"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-red-50 p-3 text-sm text-red-600"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3.5 font-medium text-white shadow-lg transition-all hover:shadow-xl opacity-90 hover:opacity-100"
            >
              <LogIn className="h-5 w-5" strokeWidth={1.5} />
              Войти
            </motion.button>
          </form>

          {/* Demo Hint */}
          <div className="mt-6 rounded-xl bg-white/20 p-4 border border-white/30 backdrop-blur-sm">
            <p className="text-xs text-foreground/80">
              <strong>Демо-аккаунты:</strong> Используйте любую учетную запись SAM из тестовых данных (например, "jive", "cfederighi") с любым паролем.
            </p>
          </div>
        </div>
      </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
