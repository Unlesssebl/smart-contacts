import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from '../components/Sidebar';
import { SpotlightSearch } from '../components/SpotlightSearch';
import { EmployeeCard } from '../components/EmployeeCard';
import { ProfileModal } from '../components/ProfileModal';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../components/ui/pagination';
import { useAppStore } from '../../store/useAppStore';
import type { User } from '../../types';
import { getEmployeeWord } from '../../lib/localization';

export function DirectoryPage() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { users, fetchUsers, isSearching, page, limit, totalUsers, setPage } = useAppStore();
  
  const totalPages = Math.ceil(totalUsers / limit);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUsers();
    useAppStore.getState().fetchFilterOptions();
  }, [fetchUsers]);

  const filteredUsers = users; // Since filtering is done server-side

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar />

      <main className="ml-72 flex-1 relative">
        <div className="mx-auto max-w-[1600px] px-8 lg:px-12 pt-12 pb-12">
          {/* Hero Section */}
          <motion.div
            ref={topRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
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
          <div className="mb-6">
            <SpotlightSearch />
          </div>

          <div className="mb-6 flex min-h-10 flex-col items-center justify-between gap-4 md:flex-row">
            <div className="text-sm text-muted-foreground">
              Найдено: {totalUsers} {getEmployeeWord(totalUsers)} (показано {users.length})
            </div>

            {totalPages > 1 && (
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={(e) => { 
                        e.preventDefault(); 
                        if (page > 1) {
                          setPage(page - 1);
                        }
                      }} 
                      className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .map((p, i, arr) => (
                      <React.Fragment key={p}>
                        {i > 0 && arr[i - 1] !== p - 1 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}
                        <PaginationItem>
                          <PaginationLink 
                            isActive={page === p}
                            onClick={(e) => { 
                              e.preventDefault(); 
                              setPage(p);
                            }}
                            className="cursor-pointer"
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      </React.Fragment>
                    ))}

                  <PaginationItem>
                    <PaginationNext 
                      onClick={(e) => { 
                        e.preventDefault(); 
                        if (page < totalPages) {
                          setPage(page + 1);
                        }
                      }}
                      className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>

          {/* Employee Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3 min-h-[300px]">
            <AnimatePresence mode="wait">
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.2 }}
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
