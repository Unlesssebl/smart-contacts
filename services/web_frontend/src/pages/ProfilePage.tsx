import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Building2, User as UserIcon, Edit, Clock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar';
import { useAppStore } from '@/store/useAppStore';

import type { User, UserProfile } from '@/types';

function EditableField({
  icon: Icon,
  label,
  value,
  pendingValue,
  isEditing,
  onChange,
  placeholder = "Не указано",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  pendingValue?: string;
  isEditing?: boolean;
  onChange?: (val: string) => void;
  placeholder?: string;
}) {
  const displayValue = (val: string) => {
    if (!val.trim()) {
      return (
        <span className="inline-flex items-center rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-medium text-muted-foreground/70">
          Не указано
        </span>
      );
    }
    return val;
  };

  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/60 border border-white/60 p-4">
      <Icon className="h-5 w-5 text-primary shrink-0" strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        
        {pendingValue !== undefined ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-foreground line-through opacity-50 truncate">{displayValue(value)}</span>
            <span className="text-sm text-foreground font-medium truncate">{displayValue(pendingValue)}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-600 shrink-0">
              <Clock className="w-3 h-3" />
              На рассмотрении
            </span>
          </div>
        ) : isEditing && onChange ? (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40"
          />
        ) : (
          <p className="text-sm text-foreground truncate">{displayValue(value)}</p>
        )}
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { getUserById, currentUser, addChangeRequest, pendingFields: globalPendingFields } = useAppStore();
  
  const storeUser = id ? getUserById(id) : null;
  const [user, setUser] = useState<User | null>(storeUser || null);
  const [isLoading, setIsLoading] = useState(!storeUser);

  useEffect(() => {
    if (storeUser) {
      setUser(storeUser);
      setIsLoading(false);
    } else if (id) {
      setIsLoading(true);
      import('@/api/users').then(({ usersApi }) => {
        usersApi.getUserByGuid(id)
          .then(data => setUser(data))
          .catch(() => setUser(null))
          .finally(() => setIsLoading(false));
      });
    }
  }, [id, storeUser]);
  const cleanValue = (val: string | null | undefined) => (val === '[]' || !val) ? '' : val;

  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobilePhone, setMobilePhone] = useState(cleanValue(user?.mobile_phone));
  const [officeLocation, setOfficeLocation] = useState(cleanValue(user?.office_location));
  const pendingFields = currentUser?.id === user?.id ? (globalPendingFields || null) : {};

  useEffect(() => {
    if (user) {
      setMobilePhone(cleanValue(user.mobile_phone));
      setOfficeLocation(cleanValue(user.office_location));
    }
  }, [user]);

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
        <main className="ml-72 flex-1 flex items-center justify-center">
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
  const hasChanges = mobilePhone !== cleanValue(user.mobile_phone) || officeLocation !== cleanValue(user.office_location);

  const handleSubmitChange = async () => {
    if (isSubmitting || !hasChanges || pendingFields === null) return;
    setIsSubmitting(true);
    let hasError = false;

    if (mobilePhone !== cleanValue(user.mobile_phone) && !('mobile_phone' in pendingFields)) {
      try {
        await addChangeRequest({
          attribute_name: 'mobile_phone',
          new_value: mobilePhone || '',
        });
      } catch (e) {
        hasError = true;
      }
    }

    if (officeLocation !== cleanValue(user.office_location) && !('office_location' in pendingFields)) {
      try {
        await addChangeRequest({
          attribute_name: 'office_location',
          new_value: officeLocation,
        });
      } catch (e) {
        hasError = true;
      }
    }

    setIsSubmitting(false);
    if (!hasError) {
      setIsEditing(false);
      setMobilePhone(cleanValue(user.mobile_phone));
      setOfficeLocation(cleanValue(user.office_location));
    }
  };

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar />

      <main className="ml-72 flex-1 relative">
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
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-3xl font-medium text-white shadow-xl">
                    {user.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
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
                      value={cleanValue(user.internal_phone)} 
                    />

                    <EditableField 
                      icon={Phone} 
                      label="Мобильный телефон" 
                      value={isEditing ? mobilePhone : cleanValue(user.mobile_phone)} 
                      pendingValue={pendingFields?.['mobile_phone']}
                      isEditing={isEditing}
                      onChange={setMobilePhone}
                    />

                    <EditableField 
                      icon={MapPin} 
                      label="Офис / Расположение" 
                      value={isEditing ? officeLocation : cleanValue(user.office_location)} 
                      pendingValue={pendingFields?.['office_location']}
                      isEditing={isEditing}
                      onChange={setOfficeLocation}
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
                          setMobilePhone(cleanValue(user.mobile_phone));
                          setOfficeLocation(cleanValue(user.office_location));
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
