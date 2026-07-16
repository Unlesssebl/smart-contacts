import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from '@/components/Sidebar';
import { SpotlightSearch } from '@/components/SpotlightSearch';
import { EmployeeCard } from '@/components/EmployeeCard';
import { ProfileModal } from '@/components/ProfileModal';
import { RadialPagination } from '@/components/RadialPagination';
import { useAppStore } from '@/store/useAppStore';
import { useAdaptiveLimit } from '@/hooks/useAdaptiveLimit';
import type { User } from '@/types';
import { getEmployeeWord } from '@/lib/localization';

export function DirectoryPage() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { users, fetchUsers, isSearching, page, limit, totalUsers, setPage } = useAppStore();
  
  const totalPages = Math.ceil(totalUsers / limit);
  const topRef = useRef<HTMLDivElement>(null);
  useAdaptiveLimit();

  useEffect(() => {
    fetchUsers();
    useAppStore.getState().fetchFilterOptions();
  }, [fetchUsers]);

  const filteredUsers = users; // Since filtering is done server-side

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="ml-72 flex-1 relative flex flex-col">
        {/* Header / Top Bar */}
        <header className="sticky top-0 z-10 w-full bg-primary/[0.03] backdrop-blur-md border-b border-primary/10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] px-8 lg:px-12 py-4 flex items-center justify-between gap-6">
          <div className="flex-1">
            <SpotlightSearch />
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 whitespace-nowrap hidden md:block">
            Найдено: {totalUsers} {getEmployeeWord(totalUsers)} (показано {users.length})
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1920px] px-8 lg:px-12 pr-28 py-8 flex-1 flex flex-col justify-center relative min-h-0">

          {totalPages > 1 && (
            <RadialPagination 
              currentPage={page} 
              totalPages={totalPages} 
              onPageChange={setPage} 
            />
          )}

          {/* Employee Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3 min-[1921px]:grid-cols-4 content-center w-full">
            <AnimatePresence>
              {filteredUsers.length === 0 ? (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.2 }}
                  className="col-span-1 lg:col-span-2 xl:col-span-3 rounded-2xl border p-12 text-center glass-card flex flex-col items-center justify-center"
                >
                  <p className="text-lg text-muted-foreground">Сотрудники не найдены</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Попробуйте изменить поисковый запрос
                  </p>
                </motion.div>
              ) : (
                filteredUsers.map((user) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="h-full"
                  >
                    <EmployeeCard
                      user={user}
                      onClick={() => setSelectedUser(user)}
                    />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>


        </div>
      </main>

      {/* Profile Modal */}
      <AnimatePresence>
        {selectedUser && (
          <ProfileModal
            key="profile-modal"
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
