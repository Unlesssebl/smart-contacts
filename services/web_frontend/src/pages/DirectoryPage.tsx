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
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  // Refs to always expose fresh values inside the stable wheel handler
  const pageRef = useRef(page);
  const totalPagesRef = useRef(totalPages);
  const selectedUserRef = useRef(selectedUser);
  const setPageRef = useRef(setPage);
  pageRef.current = page;
  totalPagesRef.current = totalPages;
  selectedUserRef.current = selectedUser;
  setPageRef.current = setPage;

  // Cooldown state — persists across re-renders, not reset on page change
  const isCoolingDownRef = useRef(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedRef = useRef(0);
  const lastEventTimeRef = useRef(0);

  useAdaptiveLimit(gridContainerRef);

  useEffect(() => {
    fetchUsers();
    // Предзагружаем опции фильтров и цвета организаций
    useAppStore.getState().fetchFilterOptions();
    useAppStore.getState().fetchOrgColors();
  }, [fetchUsers]);

  // Wheel event listener — registered ONCE (empty deps).
  // All live values (page, totalPages, selectedUser) are read via refs
  // so the closure never goes stale and the cooldown state is never reset.
  useEffect(() => {
    const COOLDOWN_MS = 450; // ms to lock after a page switch (reduced by 1.5x)
    const THRESHOLD = 60;    // accumulated deltaY to trigger a switch

    const handleWheel = (e: WheelEvent) => {
      // Do not trigger pagination when profile modal is open
      if (selectedUserRef.current) return;

      // Prevent default vertical page scroll
      e.preventDefault();

      // While cooling down, swallow all wheel input
      if (isCoolingDownRef.current) return;

      const now = Date.now();
      // Reset accumulator if there was a pause in scrolling (> 150ms gap)
      if (now - lastEventTimeRef.current > 150) {
        accumulatedRef.current = 0;
      }
      lastEventTimeRef.current = now;
      accumulatedRef.current += e.deltaY;

      const currentPage = pageRef.current;
      const currentTotalPages = totalPagesRef.current;

      let switched = false;
      if (accumulatedRef.current >= THRESHOLD && currentPage < currentTotalPages) {
        setPageRef.current(currentPage + 1);
        switched = true;
      } else if (accumulatedRef.current <= -THRESHOLD && currentPage > 1) {
        setPageRef.current(currentPage - 1);
        switched = true;
      }

      if (switched) {
        accumulatedRef.current = 0;
        isCoolingDownRef.current = true;
        if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = setTimeout(() => {
          isCoolingDownRef.current = false;
        }, COOLDOWN_MS);
      }
    };

    const mainEl = mainContainerRef.current;
    if (mainEl) {
      mainEl.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        mainEl.removeEventListener('wheel', handleWheel);
        if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps — intentional. All live values read via refs above.


  const filteredUsers = users; // Filtering handled server-side
  const showEmptyState = initialLoaded && !isSearching && filteredUsers.length === 0;

  // Compute the *actual* number of occupied grid rows from real card count.
  // This prevents 1fr rows from stretching on partial last pages.
  const colCount = window.innerWidth >= 1024 ? 3 : window.innerWidth >= 768 ? 2 : 1;
  const actualGridRows = Math.max(1, Math.ceil(filteredUsers.length / colCount));

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F5F6F8]">
      <Sidebar />

      <main
        ref={mainContainerRef}
        className="ml-72 flex-1 h-screen overflow-hidden relative flex flex-col bg-[#F5F6F8]"
      >
        {/* Header / Top Bar */}
        <header className="shrink-0 z-10 w-full border-b border-slate-200/60 bg-[#F5F6F8]/90 backdrop-blur-md px-8 py-4 lg:px-12 relative">
          <div className="mx-auto flex w-full max-w-[1920px] items-center justify-between gap-4 lg:gap-8">
            {/* Left Column: Title */}
            <div className="hidden lg:block flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#66809e] truncate">Внутренняя сеть</p>
              <h1 className="mt-1 text-[22px] font-semibold leading-none tracking-[-0.035em] text-slate-900 truncate">Справочник</h1>
            </div>

            {/* Center Column: Search */}
            <div className="w-full max-w-4xl flex-auto">
              <SpotlightSearch />
            </div>

            {/* Right Column: Counter / Empty Spacer for perfect centering */}
            <div className="hidden lg:flex flex-1 min-w-0 justify-end items-center">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap hidden xl:block pointer-events-none">
                Найдено: {totalUsers} {getEmployeeWord(totalUsers)}
              </div>
            </div>
          </div>
        </header>

        {/* Subtle Brand Background Glow */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
          style={{
            background: 'radial-gradient(circle at top left, rgba(43, 95, 224, 0.03), transparent 40%)'
          }}
        />

        <div className="relative z-[1] mx-auto w-full max-w-[1920px] pl-8 lg:pl-12 pr-24 lg:pr-32 py-6 flex-1 flex flex-col justify-start min-h-0 overflow-hidden">

          {totalPages > 1 && (
            <RadialPagination 
              currentPage={page} 
              totalPages={totalPages} 
              onPageChange={setPage} 
            />
          )}

          {/* Employee Grid Container */}
          <div ref={gridContainerRef} className="w-full flex-1 min-h-0 overflow-hidden">
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
                  className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 w-full h-full"
                  style={{ gridTemplateRows: `repeat(${actualGridRows}, minmax(0, 1fr))` }}
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
