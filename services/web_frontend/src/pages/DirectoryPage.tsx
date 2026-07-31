import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from '@/components/Sidebar';
import { SpotlightSearch } from '@/components/SpotlightSearch';
import { EmployeeCard } from '@/components/EmployeeCard';
import { ProfileModal } from '@/components/ProfileModal';
import { RadialPagination } from '@/components/RadialPagination';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    // Предзагружаем опции фильтров и цвета организаций
    useAppStore.getState().fetchFilterOptions();
    useAppStore.getState().fetchOrgColors();
  }, [fetchUsers]);

  const filteredUsers = users; // Since filtering is done server-side
  const showEmptyState = initialLoaded && !isSearching && filteredUsers.length === 0;

  return (
    <div className="flex min-h-screen bg-[#F5F6F8]">
      <Sidebar />

      <ScrollArea className="ml-72 flex-1 h-screen bg-[#F5F6F8]">
        <main className="relative flex flex-col min-h-full bg-[#F5F6F8]">
          {/* Header / Top Bar */}
          <header className="sticky top-0 z-10 w-full border-b border-slate-200/60 bg-[#F5F6F8]/90 backdrop-blur-md px-8 py-4 lg:px-12 relative">
          <div className="mx-auto flex w-full max-w-[1920px] items-center gap-8">
            <div className="hidden min-w-52 lg:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#66809e]">Внутренняя сеть</p>
              <h1 className="mt-1 text-[22px] font-semibold leading-none tracking-[-0.035em] text-slate-900">Справочник</h1>
            </div>
            <div className="mx-auto w-full max-w-2xl flex-1">
              <SpotlightSearch />
            </div>
          </div>
          <div className="absolute right-8 lg:right-12 top-[44px] -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap hidden xl:block pointer-events-none">
            Найдено: {totalUsers} {getEmployeeWord(totalUsers)}
          </div>
        </header>

        {/* Subtle Brand Background Glow */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
          style={{
            background: 'radial-gradient(circle at top left, rgba(43, 95, 224, 0.03), transparent 40%)'
          }}
        />

        <div className="relative z-[1] mx-auto w-full max-w-[1920px] pl-8 lg:pl-12 pr-24 lg:pr-32 py-8 flex-1 flex flex-col justify-start min-h-0">

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
                  className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm flex flex-col items-center justify-center"
                >
                  <p className="text-lg text-slate-600 font-medium">Сотрудники не найдены</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Попробуйте изменить поисковый запрос
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key={`grid-${page}-${searchQuery}-${JSON.stringify(filters)}`}
                  className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4 content-start items-start w-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                >
                  {filteredUsers.map((user, index) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: Math.min(index * 0.02, 0.4) }}
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
      </ScrollArea>

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

