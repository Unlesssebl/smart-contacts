import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Building2, User as UserIcon, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { UserAvatar } from '@/components/UserAvatar';

import { updateAvatarColor } from '@/api/profile';
import { CURATED_PALETTE, getAvatarColor } from '@/utils/avatar';
import { cleanProfileValue as cleanValue } from '@/features/profile/lib/profileValues';
import { useProfileEdit } from '@/features/profile/hooks/useProfileEdit';
import { usersApi } from '@/api/users';
import { EditableProfileField as EditableField } from '@/features/profile/components/EditableProfileField';

import type { User, UserProfile } from '@/types';

export function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { getUserById, currentUser, addChangeRequest, globalPendingFields } = useAppStore(
    useShallow((state) => ({
      getUserById: state.getUserById,
      currentUser: state.currentUser,
      addChangeRequest: state.addChangeRequest,
      globalPendingFields: state.pendingFields,
    })),
  );
  
  const isCurrentUserProfile = Boolean(currentUser && (currentUser.id === id || currentUser.object_guid === id));
  const storeUser = id ? getUserById(id) : null;
  const initialUser = storeUser || (isCurrentUserProfile ? (currentUser as unknown as User) : null);
  const [user, setUser] = useState<User | null>(initialUser);
  const [isLoading, setIsLoading] = useState(!initialUser);

  useEffect(() => {
    if (storeUser) {
      setUser(storeUser);
      setIsLoading(false);
    } else if (id) {
      if (!initialUser) {
        setIsLoading(true);
      }
      usersApi.getUserByGuid(id)
        .then(data => setUser(data))
        .catch(() => {
          if (isCurrentUserProfile && currentUser) {
            setUser(currentUser as unknown as User);
          } else {
            setUser(null);
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [id, storeUser, isCurrentUserProfile, currentUser, initialUser]);

  const pendingFields = currentUser?.id === user?.id ? (globalPendingFields || null) : {};
  const {
    isEditing,
    setIsEditing,
    isSubmitting,
    internalPhone,
    setInternalPhone,
    mobilePhone,
    setMobilePhone,
    officeLocation,
    setOfficeLocation,
    hasChanges,
    reset: resetProfileEdit,
    submit: handleSubmitChange,
  } = useProfileEdit({ user, pendingFields, addChangeRequest });

  useEffect(() => {
    if (currentUser?.id === user?.id) {
      useAppStore.getState().fetchMyPendingFields();
    }
  }, [currentUser?.id, user?.id]);

  const displayValue = (val: string | null | undefined) => {
    const cleaned = cleanValue(val);
    if (!cleaned.trim()) {
      return (
        <span className="inline-flex items-center rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-medium text-muted-foreground/70">
          Не указано
        </span>
      );
    }
    return cleaned;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-transparent">
        <Sidebar />
        <main className="ml-[17.25rem] flex flex-1 items-center justify-center">
          <div className="text-muted-foreground">Загрузка профиля...</div>
        </main>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const manager = user.manager_id ? getUserById(user.manager_id) : null;
  const isCurrentUser = currentUser?.id === user.id;

  const handleColorSelect = async (color: string) => {
    if (!user) return;
    const previousColor = user.avatar_color;

    // Optimistically update local state & global store
    setUser((prev) => (prev ? { ...prev, avatar_color: color } : null));
    useAppStore.getState().updateUserInStore(user.id, { avatar_color: color });

    try {
      await updateAvatarColor(color);
      toast.success('Цвет аватарки обновлен');
    } catch {
      // Revert on error
      setUser((prev) => (prev ? { ...prev, avatar_color: previousColor } : null));
      useAppStore.getState().updateUserInStore(user.id, { avatar_color: previousColor });
      toast.error('Не удалось обновить цвет аватарки');
    }
  };

  const currentAvatarColor = user ? getAvatarColor(user.department, user.avatar_color) : '';

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar />

      <main className="relative ml-[17.25rem] flex-1">
        <div className="mx-auto max-w-4xl px-8 pt-12 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden glass-card p-0"
          >
            {/* Header */}
            <div className="border-b border-black/5 px-8 py-8">
              <div className="flex items-start gap-6">
                <div className="relative">
                  <UserAvatar 
                    name={user.full_name} 
                    avatarColor={user.avatar_color}
                    className="h-24 w-24 text-3xl shadow-xl"
                  />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-semibold text-foreground">{user.full_name}</h1>
                    {isCurrentUser && (currentUser as UserProfile)?.sam_account_name && (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {(currentUser as UserProfile).sam_account_name}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-lg text-muted-foreground">{displayValue(user.job_title)}</p>
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" strokeWidth={1.5} />
                    <span>{displayValue([cleanValue(user.organization), cleanValue(user.department)].filter(Boolean).join(' • '))}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="space-y-6">
                <div>
                  <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Контактная информация
                  </h3>
                  <div className="space-y-3">
                    <EditableField 
                      icon={Mail} 
                      label="Email" 
                      value={cleanValue(user.email)} 
                    />
                    
                    <EditableField 
                      icon={Phone} 
                      label="Внутренний телефон" 
                      value={isEditing ? internalPhone : cleanValue(user.internal_phone)} 
                      pendingValue={pendingFields?.['internal_phone']}
                      isEditing={isEditing}
                      onChange={setInternalPhone}
                      mask="00-00"
                      placeholder="20-20"
                      hint="Формат: 00-00 (например: 24-12)"
                    />

                    <EditableField 
                      icon={Phone} 
                      label="Мобильный телефон" 
                      value={isEditing ? mobilePhone : cleanValue(user.mobile_phone)} 
                      pendingValue={pendingFields?.['mobile_phone']}
                      isEditing={isEditing}
                      onChange={setMobilePhone}
                      mask="+{7} (000) 000-00-00"
                      placeholder="+7 (999) 000-00-00"
                      hint="Формат: +7 (999) 000-00-00"
                    />

                    <EditableField 
                      icon={MapPin} 
                      label="Офис / Расположение" 
                      value={isEditing ? officeLocation : cleanValue(user.office_location)} 
                      pendingValue={pendingFields?.['office_location']}
                      isEditing={isEditing}
                      onChange={setOfficeLocation}
                      placeholder="Например: Кабинет 402"
                      hint="Укажите номер кабинета или здания"
                    />
                  </div>
                </div>

                {manager && (
                  <div>
                    <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Организация</h3>
                    <div className="flex items-center gap-3 rounded-xl bg-white/60 border border-white/60 p-4">
                      <UserIcon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                      <div>
                        <p className="text-xs text-muted-foreground">Руководитель</p>
                        <p className="text-sm text-foreground">{manager.full_name}</p>
                        <p className="text-xs text-muted-foreground">{displayValue(manager.job_title)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {isCurrentUser && (
                  <div>
                    <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Внешний вид</h3>
                    <div className="rounded-xl bg-white/60 border border-white/60 p-5">
                      <p className="text-sm text-muted-foreground mb-4">Выберите цвет для вашей аватарки в справочнике:</p>
                      <div className="flex flex-wrap gap-3">
                        {CURATED_PALETTE.map((color) => (
                          <button
                            key={color}
                            onClick={() => handleColorSelect(color)}
                            className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 ${
                              currentAvatarColor === color ? 'border-foreground shadow-md scale-110' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                            aria-label={`Выбрать цвет ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {isCurrentUser && (
                <div className="mt-8 flex gap-3 pt-6 border-t border-black/5">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSubmitChange}
                        disabled={isSubmitting || !hasChanges}
                        className={`flex-1 btn-primary py-3 ${isSubmitting || !hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isSubmitting ? 'Отправка...' : 'Отправить запрос на изменение'}
                      </button>
                      <button
                        onClick={() => {
                          if (isSubmitting) return;
                          setIsEditing(false);
                          resetProfileEdit();
                        }}
                        disabled={isSubmitting}
                        className={`btn-secondary px-6 py-3 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Отмена
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      disabled={pendingFields === null}
                      className={`btn-secondary px-6 py-3 gap-2 ${pendingFields === null ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Edit className="h-4 w-4" strokeWidth={1.5} />
                      {pendingFields === null ? 'Загрузка...' : 'Редактировать профиль'}
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
