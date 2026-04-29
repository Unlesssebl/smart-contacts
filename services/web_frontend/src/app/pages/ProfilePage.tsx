import { useState } from 'react';
import { useParams, Navigate } from 'react-router';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Building2, User as UserIcon, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '../components/Sidebar';
import { useAppStore } from '../../store/useAppStore';

export function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { getUserById, currentUser, addChangeRequest } = useAppStore();

  const user = id ? getUserById(id) : null;
  const [isEditing, setIsEditing] = useState(false);
  const [mobilePhone, setMobilePhone] = useState(user?.mobile_phone || '');
  const [officeLocation, setOfficeLocation] = useState(user?.office_location || '');

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const manager = user.manager_id ? getUserById(user.manager_id) : null;

  const handleSubmitChange = () => {
    let changeCount = 0;

    if (mobilePhone !== user.mobile_phone) {
      addChangeRequest({
        user_id: user.id,
        user_name: user.full_name,
        attribute_name: 'mobile_phone',
        old_value: user.mobile_phone,
        new_value: mobilePhone,
        status: 'pending',
      });
      changeCount++;
    }

    if (officeLocation !== (user.office_location || '')) {
      addChangeRequest({
        user_id: user.id,
        user_name: user.full_name,
        attribute_name: 'office_location',
        old_value: user.office_location || '',
        new_value: officeLocation,
        status: 'pending',
      });
      changeCount++;
    }

    if (changeCount > 0) {
      toast.success('Change request submitted', {
        description: `${changeCount} change${changeCount > 1 ? 's' : ''} pending admin approval`,
      });
    }

    setIsEditing(false);
  };

  return (
    <div className="flex min-h-screen" style={{ background: '#F5F5F7' }}>
      <Sidebar />

      <main className="ml-64 flex-1">
        <div className="mx-auto max-w-4xl px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-3xl shadow-2xl"
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(60px)',
              border: '0.5px solid rgba(255, 255, 255, 0.5)',
              boxShadow:
                'inset 0.5px 0.5px 0 rgba(255, 255, 255, 0.5), 0 8px 32px rgba(0, 0, 0, 0.12), 0 32px 64px rgba(0, 0, 0, 0.16)',
            }}
          >
            {/* Header */}
            <div className="border-b border-black/5 px-8 py-8">
              <div className="flex items-start gap-6">
                <div className="relative">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] text-3xl font-medium text-white shadow-xl">
                    {user.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  {user.is_online && (
                    <motion.div
                      className="absolute bottom-1 right-1 h-6 w-6 rounded-full border-4 border-white"
                      style={{ background: '#34C759' }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                  )}
                </div>

                <div className="flex-1">
                  <h1 className="text-3xl font-semibold text-[#1C1C1E]">{user.full_name}</h1>
                  <p className="mt-1 text-lg text-[#8E8E93]">{user.job_title}</p>
                  <div className="mt-3 flex items-center gap-2 text-sm text-[#8E8E93]">
                    <Building2 className="h-4 w-4" strokeWidth={1.5} />
                    <span>{user.department}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="space-y-6">
                <div>
                  <h3 className="mb-4 text-sm font-semibold text-[#1C1C1E]">
                    Contact Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-xl bg-white/50 p-4">
                      <Mail className="h-5 w-5 text-[#007AFF]" strokeWidth={1.5} />
                      <div>
                        <p className="text-xs text-[#8E8E93]">Email</p>
                        <p className="text-sm text-[#1C1C1E]">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl bg-white/50 p-4">
                      <Phone className="h-5 w-5 text-[#007AFF]" strokeWidth={1.5} />
                      <div>
                        <p className="text-xs text-[#8E8E93]">Internal Phone</p>
                        <p className="text-sm text-[#1C1C1E]">{user.internal_phone}</p>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-3 rounded-xl bg-white/50 p-4">
                        <Phone className="h-5 w-5 text-[#007AFF]" strokeWidth={1.5} />
                        <div className="flex-1">
                          <p className="mb-1 text-xs text-[#8E8E93]">Mobile Phone</p>
                          <input
                            type="text"
                            value={mobilePhone}
                            onChange={(e) => setMobilePhone(e.target.value)}
                            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-[#1C1C1E] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 rounded-xl bg-white/50 p-4">
                        <Phone className="h-5 w-5 text-[#007AFF]" strokeWidth={1.5} />
                        <div>
                          <p className="text-xs text-[#8E8E93]">Mobile Phone</p>
                          <p className="text-sm text-[#1C1C1E]">{user.mobile_phone}</p>
                        </div>
                      </div>
                    )}

                    {isEditing ? (
                      <div className="flex items-center gap-3 rounded-xl bg-white/50 p-4">
                        <MapPin className="h-5 w-5 text-[#007AFF]" strokeWidth={1.5} />
                        <div className="flex-1">
                          <p className="mb-1 text-xs text-[#8E8E93]">Office Location</p>
                          <input
                            type="text"
                            value={officeLocation}
                            onChange={(e) => setOfficeLocation(e.target.value)}
                            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-[#1C1C1E] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20"
                          />
                        </div>
                      </div>
                    ) : (
                      user.office_location && (
                        <div className="flex items-center gap-3 rounded-xl bg-white/50 p-4">
                          <MapPin className="h-5 w-5 text-[#007AFF]" strokeWidth={1.5} />
                          <div>
                            <p className="text-xs text-[#8E8E93]">Office Location</p>
                            <p className="text-sm text-[#1C1C1E]">{user.office_location}</p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {manager && (
                  <div>
                    <h3 className="mb-4 text-sm font-semibold text-[#1C1C1E]">Organization</h3>
                    <div className="flex items-center gap-3 rounded-xl bg-white/50 p-4">
                      <UserIcon className="h-5 w-5 text-[#007AFF]" strokeWidth={1.5} />
                      <div>
                        <p className="text-xs text-[#8E8E93]">Reports to</p>
                        <p className="text-sm text-[#1C1C1E]">{manager.full_name}</p>
                        <p className="text-xs text-[#8E8E93]">{manager.job_title}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {currentUser?.id === user.id && (
                <div className="mt-6 flex gap-3">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSubmitChange}
                        className="flex-1 rounded-xl bg-[#007AFF] px-6 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-[#0051D5]"
                      >
                        Submit Change Request
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setMobilePhone(user.mobile_phone);
                          setOfficeLocation(user.office_location || '');
                        }}
                        className="rounded-xl border border-black/10 bg-white/60 px-6 py-3 text-sm font-medium text-[#1C1C1E] transition-colors hover:bg-white/80"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 rounded-xl border border-black/10 bg-white/60 px-6 py-3 text-sm font-medium text-[#1C1C1E] transition-colors hover:bg-white/80"
                    >
                      <Edit className="h-4 w-4" strokeWidth={1.5} />
                      Edit Profile
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
