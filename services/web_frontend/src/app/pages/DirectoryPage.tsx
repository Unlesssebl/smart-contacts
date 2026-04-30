import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from '../components/Sidebar';
import { SpotlightSearch } from '../components/SpotlightSearch';
import { EmployeeCard } from '../components/EmployeeCard';
import { ProfileModal } from '../components/ProfileModal';
import { useAppStore } from '../../store/useAppStore';
import { User } from '../../types';

export function DirectoryPage() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const getFilteredUsers = useAppStore((state) => state.getFilteredUsers);
  const filteredUsers = getFilteredUsers();

  return (
    <div className="flex min-h-screen" style={{ background: '#F5F5F7' }}>
      <Sidebar />

      <main className="ml-64 flex-1">
        <div className="mx-auto max-w-7xl px-8 py-12">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-12 text-center"
          >
            <h1 className="mb-3 text-4xl font-semibold tracking-tight text-[#1C1C1E]">
              Employee Directory
            </h1>
            <p className="text-lg text-[#8E8E93]">
              Find and connect with colleagues across the organization
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
                className="rounded-2xl border p-12 text-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.6)',
                  backdropFilter: 'blur(40px)',
                  border: '0.5px solid rgba(255, 255, 255, 0.4)',
                }}
              >
                <p className="text-lg text-[#8E8E93]">No employees found</p>
                <p className="mt-2 text-sm text-[#8E8E93]">
                  Try adjusting your search query
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
            className="mt-8 text-center text-sm text-[#8E8E93]"
          >
            Showing {filteredUsers.length} {filteredUsers.length === 1 ? 'employee' : 'employees'}
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
