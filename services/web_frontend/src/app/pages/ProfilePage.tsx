import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Building2, User as UserIcon, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '../components/Sidebar';
import { useAppStore } from '../../store/useAppStore';
import { getChangeWord } from '../../lib/localization';

import type { User } from '../../types';

export function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { getUserById, currentUser, addChangeRequest } = useAppStore();
  
  const storeUser = id ? getUserById(id) : null;
  const [user, setUser] = useState<User | null>(storeUser || null);
  const [isLoading, setIsLoading] = useState(!storeUser);

  useEffect(() => {
    if (storeUser) {
      setUser(storeUser);
      setIsLoading(false);
    } else if (id) {
      setIsLoading(true);
      import('../../api/users').then(({ usersApi }) => {
        usersApi.getUserByGuid(id)
          .then(data => setUser(data))
          .catch(() => setUser(null))
          .finally(() => setIsLoading(false));
      });
    }
  }, [id, storeUser]);
  const cleanValue = (val: string | null | undefined) => (val === '[]' || !val) ? '' : val;

  const [isEditing, setIsEditing] = useState(false);
  const [mobilePhone, setMobilePhone] = useState(cleanValue(user?.mobile_phone));
  const [officeLocation, setOfficeLocation] = useState(cleanValue(user?.office_location));

  useEffect(() => {
    if (user) {
      setMobilePhone(cleanValue(user.mobile_phone));
      setOfficeLocation(cleanValue(user.office_location));
    }
  }, [user]);

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

  const handleSubmitChange = async () => {
    let changeCount = 0;

    if (mobilePhone !== (user.mobile_phone || '')) {
      await addChangeRequest({
        attribute_name: 'mobile_phone',
        new_value: mobilePhone || '',
      });
      changeCount++;
    }

    if (officeLocation !== (user.office_location || '')) {
      await addChangeRequest({
        attribute_name: 'office_location',
        new_value: officeLocation,
      });
      changeCount++;
    }

    setIsEditing(false);
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
                  <h1 className="text-3xl font-semibold text-foreground">{user.full_name}</h1>
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
                    <div className="flex items-center gap-3 rounded-xl bg-white/60 border border-white/60 p-4">
                      <Mail className="h-5 w-5 text-primary" strokeWidth={1.5} />
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm text-foreground">{displayValue(user.email)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl bg-white/60 border border-white/60 p-4">
                      <Phone className="h-5 w-5 text-primary" strokeWidth={1.5} />
                      <div>
                        <p className="text-xs text-muted-foreground">Внутренний телефон</p>
                        <p className="text-sm text-foreground">{displayValue(user.internal_phone)}</p>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-3 rounded-xl bg-white/60 border border-white/60 p-4">
                        <Phone className="h-5 w-5 text-primary" strokeWidth={1.5} />
                          <div className="flex-1">
                            <p className="mb-1 text-xs text-muted-foreground">Мобильный телефон</p>
                            <input
                              type="text"
                              value={mobilePhone}
                              onChange={(e) => setMobilePhone(e.target.value)}
                              placeholder="Не указано"
                              className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40"
                            />
                          </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 rounded-xl bg-white/60 border border-white/60 p-4">
                        <Phone className="h-5 w-5 text-primary" strokeWidth={1.5} />
                        <div>
                          <p className="text-xs text-muted-foreground">Мобильный телефон</p>
                          <p className="text-sm text-foreground">{displayValue(user.mobile_phone)}</p>
                        </div>
                      </div>
                    )}

                    {isEditing ? (
                      <div className="flex items-center gap-3 rounded-xl bg-white/60 border border-white/60 p-4">
                        <MapPin className="h-5 w-5 text-primary" strokeWidth={1.5} />
                        <div className="flex-1">
                          <p className="mb-1 text-xs text-muted-foreground">Офис / Расположение</p>
                          <input
                            type="text"
                            value={officeLocation}
                            onChange={(e) => setOfficeLocation(e.target.value)}
                            placeholder="Не указано"
                            className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 rounded-xl bg-white/60 border border-white/60 p-4">
                        <MapPin className="h-5 w-5 text-primary" strokeWidth={1.5} />
                        <div>
                          <p className="text-xs text-muted-foreground">Офис / Расположение</p>
                          <p className="text-sm text-foreground">{displayValue(user.office_location)}</p>
                        </div>
                      </div>
                    )}
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

              {currentUser?.id === user.id && (
                <div className="mt-6 flex gap-3">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSubmitChange}
                        className="flex-1 btn-primary py-3"
                      >
                        Отправить запрос на изменение
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setMobilePhone(cleanValue(user.mobile_phone));
                          setOfficeLocation(cleanValue(user.office_location));
                        }}
                        className="btn-secondary px-6 py-3"
                      >
                        Отмена
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="btn-secondary px-6 py-3 gap-2"
                    >
                      <Edit className="h-4 w-4" strokeWidth={1.5} />
                      Редактировать профиль
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
