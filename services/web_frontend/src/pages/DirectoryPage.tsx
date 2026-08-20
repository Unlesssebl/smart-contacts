import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from '@/components/Sidebar';
import { SpotlightSearch } from '@/components/SpotlightSearch';
import { EmployeeCard } from '@/components/EmployeeCard';
import { ProfileModal } from '@/components/ProfileModal';
import { RadialPagination } from '@/components/RadialPagination';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useAdaptiveLimit } from '@/hooks/useAdaptiveLimit';
import type { User } from '@/types';
import { getEmployeeWord } from '@/lib/localization';

export function DirectoryPage() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { users, fetchUsers, isSearching, initialLoaded, page, limit, totalUsers, setPage, searchQuery, filters } = useAppStore(
    useShallow((state) => ({
      users: state.users,
      fetchUsers: state.fetchUsers,
      isSearching: state.isSearching,
      initialLoaded: state.initialLoaded,
      page: state.page,
      limit: state.limit,
      totalUsers: state.totalUsers,
      setPage: state.setPage,
      searchQuery: state.searchQuery,
      filters: state.filters,
    })),
  );
  
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

  const { isReady: isGridReady } = useAdaptiveLimit(gridContainerRef);

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
  }, []); // Empty deps — intentional. All live values read via refs above.


  const filteredUsers = users; // Filtering handled server-side
  const showEmptyState = initialLoaded && !isSearching && filteredUsers.length === 0;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f4f6f8]">
      <Sidebar />

      <main
        ref={mainContainerRef}
        className="relative ml-[17.25rem] flex h-screen flex-1 flex-col overflow-hidden bg-[#f4f6f8]"
      >
        {/* Header / Top Bar */}
        <header className="relative z-10 w-full shrink-0 border-b border-[#dfe5eb]/80 bg-[#f4f6f8]/90 px-8 py-3 backdrop-blur-md lg:px-12">
          <div className="mx-auto flex w-full max-w-[1920px] items-center justify-between gap-4 lg:gap-8">
            {/* Left Column: Title */}
            <div className="hidden min-w-0 flex-1 items-center lg:flex">
              <div className="flex items-center gap-4">
                <img
                  src="/dit-logo.png"
                  alt=""
                  aria-hidden="true"
                  className="h-14 w-auto shrink-0 object-contain"
                />
                <div className="flex flex-col text-[#245f9f]">
                  <span className="text-[11px] font-bold uppercase leading-none tracking-[0.18em]">
                    Департамент
                  </span>
                  <span className="mt-1.5 text-[18px] font-bold uppercase leading-none tracking-[0.14em]">
                    ИТ
                  </span>
                </div>
              </div>
            </div>

            {/* Center Column: Search */}
            <div className="w-full max-w-4xl flex-auto">
              <SpotlightSearch />
            </div>

            {/* Right Column: Counter / Empty Spacer for perfect centering */}
            <div className="hidden lg:flex flex-1 min-w-0 justify-end items-center">
              <div className="pointer-events-none hidden whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.15em] text-[#637792] xl:block">
                Найдено: {totalUsers} {getEmployeeWord(totalUsers)}
              </div>
            </div>
          </div>
        </header>

        {/* Subtle Brand Background Glow */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
          style={{
            background: 'radial-gradient(circle at 20% 0%, rgba(68, 113, 155, 0.055), transparent 34%), radial-gradient(circle at 92% 100%, rgba(91, 126, 155, 0.035), transparent 30%)'
          }}
        />

        <div className="relative z-[1] mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col justify-start overflow-hidden py-6 pl-8 pr-24 lg:pl-12 lg:pr-32">

          {totalPages > 1 && (
            <RadialPagination 
              currentPage={page} 
              totalPages={totalPages} 
              onPageChange={setPage} 
            />
          )}

          {/* Employee Grid Container */}
          <div
            ref={gridContainerRef}
            className={`min-h-0 w-full flex-1 overflow-hidden transition-opacity duration-200 ${
              isGridReady ? 'opacity-100' : 'opacity-0'
            }`}
          >
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
                  data-adaptive-grid
                  className="grid w-full grid-cols-1 content-start items-start gap-5 pt-2 xl:grid-cols-2 2xl:grid-cols-3"
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
                      className="w-full"
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
