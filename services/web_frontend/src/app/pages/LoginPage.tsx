import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { LogIn } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export function LoginPage() {
  const [samAccount, setSamAccount] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const login = useAppStore((state) => state.login);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const success = login(samAccount, password);
    if (success) {
      navigate('/');
    } else {
      setError('Invalid credentials. Try: jive, cfederighi, sprescott, jternus, dobrien, or ecue');
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: '#F5F5F7' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-md overflow-hidden rounded-3xl shadow-2xl"
        style={{
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(60px)',
          border: '0.5px solid rgba(255, 255, 255, 0.5)',
          boxShadow:
            'inset 0.5px 0.5px 0 rgba(255, 255, 255, 0.5), 0 8px 32px rgba(0, 0, 0, 0.12), 0 32px 64px rgba(0, 0, 0, 0.16)',
        }}
      >
        <div className="p-10">
          {/* Logo */}
          <div className="text-center">
            <h1 className="bg-gradient-to-r from-[#007AFF] to-[#5AC8FA] bg-clip-text text-4xl font-semibold tracking-tight text-transparent">
              Crystal
            </h1>
            <p className="mt-2 text-sm text-[#8E8E93]">Corporate Directory</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#1C1C1E]">
                SAM Account
              </label>
              <input
                type="text"
                value={samAccount}
                onChange={(e) => setSamAccount(e.target.value)}
                placeholder="Enter your SAM account"
                required
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm text-[#1C1C1E] outline-none transition-all focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/10"
                style={{
                  background: 'rgba(255, 255, 255, 0.6)',
                  backdropFilter: 'blur(10px)',
                }}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#1C1C1E]">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm text-[#1C1C1E] outline-none transition-all focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/10"
                style={{
                  background: 'rgba(255, 255, 255, 0.6)',
                  backdropFilter: 'blur(10px)',
                }}
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
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#007AFF] px-6 py-3.5 font-medium text-white shadow-lg transition-all hover:bg-[#0051D5] hover:shadow-xl"
            >
              <LogIn className="h-5 w-5" strokeWidth={1.5} />
              Sign In
            </motion.button>
          </form>

          {/* Demo Hint */}
          <div className="mt-6 rounded-xl bg-blue-50 p-4">
            <p className="text-xs text-[#007AFF]">
              <strong>Demo Accounts:</strong> Use any SAM account from the mock data (e.g., "jive",
              "cfederighi") with any password.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
