import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from '../components/Sidebar';
import { SpotlightSearch } from '../components/SpotlightSearch';
import { EmployeeCard } from '../components/EmployeeCard';
import { ProfileModal } from '../components/ProfileModal';
import { useAppStore } from '../../store/useAppStore';
import type { User } from '../../types';
import { getEmployeeWord } from '../../lib/localization';

export function DirectoryPage() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { users, fetchUsers, isSearching } = useAppStore();

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users; // Since filtering is done server-side

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar />

      <main className="ml-72 flex-1 relative">
        <div className="mx-auto max-w-7xl px-8 pt-12 pb-12">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-12 text-center"
          >
            <h1 className="mb-3 text-4xl font-semibold tracking-tight text-foreground">
              Справочник сотрудников
            </h1>
            <p className="text-lg text-muted-foreground">
              Находите коллег и связывайтесь с ними по всей организации
            </p>
          </motion.div>

          {/* Spotlight Search */}
          <div className="mb-12">
            <SpotlightSearch />
          </div>

          {/* Employee Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {filteredUsers.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border p-12 text-center glass-card"
              >
                <p className="text-lg text-muted-foreground">Сотрудники не найдены</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Попробуйте изменить поисковый запрос
                </p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {filteredUsers.map((user) => (
                    <EmployeeCard
                      key={user.id}
                      user={user}
                      onClick={() => setSelectedUser(user)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

          {/* Results Count */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-center text-sm text-muted-foreground"
          >
            Показано: {filteredUsers.length} {getEmployeeWord(filteredUsers.length)}
          </motion.div>
        </div>
      </main>

      {/* Profile Modal */}
      {selectedUser && (
        <ProfileModal
          user={selectedUser}
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
