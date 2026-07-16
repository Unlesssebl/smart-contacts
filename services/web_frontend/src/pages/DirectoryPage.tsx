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
  const { users, fetchUsers, isSearching, initialLoaded, page, limit, totalUsers, setPage, searchQuery, filters } = useAppStore();
  
  const totalPages = Math.ceil(totalUsers / limit);
  const topRef = useRef<HTMLDivElement>(null);
  useAdaptiveLimit();

  useEffect(() => {
    fetchUsers();
    useAppStore.getState().fetchFilterOptions();
  }, [fetchUsers]);

  const filteredUsers = users; // Since filtering is done server-side
  const showEmptyState = initialLoaded && !isSearching && filteredUsers.length === 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="ml-72 flex-1 relative flex flex-col">
        {/* Header / Top Bar */}
        <header className="sticky top-0 z-10 w-full bg-primary/[0.03] backdrop-blur-md border-b border-primary/10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] px-8 lg:px-12 py-4 relative">
          <div className="mx-auto w-full max-w-3xl">
            <SpotlightSearch />
          </div>
          <div className="absolute right-8 lg:right-12 top-[44px] -translate-y-1/2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 whitespace-nowrap hidden xl:block pointer-events-none">
            Найдено: {totalUsers} {getEmployeeWord(totalUsers)}
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
          <div className="w-full">
            <AnimatePresence mode="wait">
              {showEmptyState ? (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.2 }}
                  className="mx-auto max-w-3xl rounded-2xl border p-12 text-center glass-card flex flex-col items-center justify-center"
                >
                  <p className="text-lg text-muted-foreground">Сотрудники не найдены</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Попробуйте изменить поисковый запрос
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key={`grid-${page}-${searchQuery}-${JSON.stringify(filters)}`}
                  className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3 min-[1921px]:grid-cols-4 content-center w-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                >
                  {filteredUsers.map((user, index) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: Math.min(index * 0.025, 0.5) }}
                      className="h-full"
                    >
                      <EmployeeCard
                        user={user}
                        onClick={() => setSelectedUser(user)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
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
