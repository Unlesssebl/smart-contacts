import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Copy, Mail, Phone, Smartphone, MapPin, X, Building2, User as UserIcon, Edit } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { UserAvatar } from './UserAvatar';
import { adminApi } from '@/api/admin';
import { ReportModal } from './ReportModal';
import { cleanProfileValue as cleanValue, formatActiveDirectoryPath } from '@/features/profile/lib/profileValues';
import { useProfileEdit } from '@/features/profile/hooks/useProfileEdit';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
}

const copyToClipboard = async (text: string) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('Navigator clipboard failed, trying fallback...', err);
  }

  // Fallback for non-secure HTTP contexts
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback copy failed', err);
    document.body.removeChild(textArea);
    return false;
  }
};

export function ProfileModal({ user, onClose }: ProfileModalProps) {
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

  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [isHidden, setIsHidden] = useState(user.is_hidden || false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Глобальный стейт — загружается при логине (fetchMe) и поддерживается в актуальном состоянии
  const { addChangeRequest, currentUser, getUserById, globalPresence, pendingFields, updateUserInStore } = useAppStore(
    useShallow((state) => ({
      addChangeRequest: state.addChangeRequest,
      currentUser: state.currentUser,
      getUserById: state.getUserById,
      globalPresence: state.globalPresence,
      pendingFields: state.pendingFields,
      updateUserInStore: state.updateUserInStore,
    })),
  );

  const manager = user.manager_id ? getUserById(user.manager_id) : null;
  const currentPresence = globalPresence[user.id] || user.presence;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'it_operator';
  const {
    isEditing,
    setIsEditing,
    isSubmitting,
    mobilePhone,
    setMobilePhone,
    officeLocation,
    setOfficeLocation,
    reset: resetProfileEdit,
    submit: handleSubmitChange,
  } = useProfileEdit({ user, pendingFields, addChangeRequest });

  // Блокировка скролла специально для OverlayScrollbars
  // Модификация body ломала OverlayScrollbars и вызывала ремаунт всего приложения
  useEffect(() => {
    const viewport = document.querySelector('[data-overlayscrollbars-viewport]') as HTMLElement;
    if (viewport) {
      viewport.style.overflow = 'hidden';
    }
    return () => {
      if (viewport) {
        viewport.style.overflow = '';
      }
    };
  }, []);

  // Закрытие модального окна по клавише ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);


  return (
    <>
      {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onPointerDown={onClose}>
            <motion.div
              onPointerDown={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-2xl overflow-hidden glass-card p-0"
            >
              {/* Header */}
              <div className="relative border-b border-black/5 px-8 py-6">
                <button
                  onClick={onClose}
                  className="absolute right-6 top-6 rounded-full p-2 transition-colors hover:bg-black/5"
                >
                  <X className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                </button>

                <div className="flex items-start gap-6">
                  {/* Large Avatar */}
                  <UserAvatar 
                    name={user.full_name} 
                    avatarColor={user.avatar_color}
                    presence={currentPresence} 
                    className="h-24 w-24 text-3xl shadow-xl"
                    statusClassName="h-5 w-5 border-[3px]"
                  />

                  {/* User Info */}
                  <div className="flex-1">
                    <h2 className="text-2xl font-semibold text-foreground">{user.full_name}</h2>
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
                  {/* Contact Information */}
                  <div>
                    <h3 className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
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

                      {isEditing ? (
                        <>
                          <div className="flex items-center gap-3 rounded-xl bg-white/60 border border-white/60 p-4">
                            <Phone className="h-5 w-5 text-primary" strokeWidth={1.5} />
                            <div>
                              <p className="text-xs text-muted-foreground">Внутренний телефон (из AD)</p>
                              <p className="text-sm text-foreground">{displayValue(user.internal_phone)}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 rounded-xl bg-white/60 border border-white/60 p-4">
                            <Smartphone className="h-5 w-5 text-primary" strokeWidth={1.5} />
                            <div className="flex-1">
                              <p className="mb-1 text-xs text-muted-foreground">Изменить мобильный телефон</p>
                              {pendingFields && 'mobile_phone' in pendingFields ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-foreground">{displayValue(user.mobile_phone)}</span>
                                  <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                                    Заявка на рассмотрении
                                  </span>
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  value={mobilePhone}
                                  onChange={(e) => setMobilePhone(e.target.value)}
                                  placeholder="Не указано"
                                  className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40"
                                />
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <>
                            <div className="flex items-center gap-3 rounded-xl bg-white/60 border border-white/60 p-4">
                              <Phone className="h-5 w-5 text-primary" strokeWidth={1.5} />
                              <div>
                                <p className="text-xs text-muted-foreground">Внутренний телефон</p>
                                <p className="text-sm text-foreground">{displayValue(user.internal_phone)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 rounded-xl bg-white/60 border border-white/60 p-4">
                              <Smartphone className="h-5 w-5 text-primary" strokeWidth={1.5} />
                              <div>
                                <p className="text-xs text-muted-foreground">Мобильный телефон</p>
                                <p className="text-sm text-foreground">{displayValue(user.mobile_phone)}</p>
                              </div>
                            </div>
                          </>
                        </>
                      )}

                      {isEditing ? (
                        <div className="flex items-center gap-3 rounded-xl bg-white/60 border border-white/60 p-4">
                          <MapPin className="h-5 w-5 text-primary" strokeWidth={1.5} />
                          <div className="flex-1">
                            <p className="mb-1 text-xs text-muted-foreground">Офис / Расположение</p>
                            {pendingFields && 'office_location' in pendingFields ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-foreground">{displayValue(user.office_location)}</span>
                                <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                                  Заявка на рассмотрении
                                </span>
                              </div>
                            ) : (
                              <input
                                type="text"
                                value={officeLocation}
                                onChange={(e) => setOfficeLocation(e.target.value)}
                                placeholder="Не указано"
                                className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40"
                              />
                            )}
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

                  {/* Organization */}
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

                  {/* Admin-only info */}
                  {isAdmin && user.ad_dn && (
                    <div>
                      <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Администрирование
                      </h3>
                      <div className="rounded-xl border border-black/5 bg-white/40 p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground mb-2">Путь в Active Directory</p>
                            
                            {/* Breadcrumb Path */}
                            {(() => {
                              const formatted = formatActiveDirectoryPath(user.ad_dn);
                              return (
                                <div className="flex flex-wrap items-center gap-1.5 text-xs text-foreground font-medium">
                                  {formatted.hierarchy.map((item, idx) => (
                                    <span key={idx} className="flex items-center gap-1.5">
                                      {idx > 0 && <span className="text-muted-foreground/30">➔</span>}
                                      <span className="rounded-lg bg-black/5 px-2.5 py-1 border border-black/5">
                                        {item}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                          
                          {/* Copy Button */}
                          <button
                            onClick={async () => {
                              const success = await copyToClipboard(user.ad_dn || '');
                              if (success) {
                                toast.success('Путь скопирован в буфер обмена');
                              } else {
                                toast.error('Не удалось скопировать путь');
                              }
                            }}
                            className="rounded-lg p-2.5 text-muted-foreground hover:bg-black/5 hover:text-foreground transition-colors border border-black/5 bg-white/80 shadow-sm shrink-0 flex items-center justify-center"
                            title="Скопировать DN в буфер обмена"
                          >
                            <Copy className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-4 rounded-xl border border-black/5 bg-white/40 p-4 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">Скрыть из справочника (сервисная УЗ)</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Пользователь будет виден только администраторам
                          </p>
                        </div>
                        <button
                          disabled={isUpdatingVisibility}
                          onClick={async () => {
                            try {
                              setIsUpdatingVisibility(true);
                              const newHiddenState = !isHidden;
                              await adminApi.updateUserVisibility(user.id, newHiddenState);
                              setIsHidden(newHiddenState);
                              updateUserInStore(user.id, { is_hidden: newHiddenState });
                              toast.success(newHiddenState ? 'Учетная запись скрыта' : 'Учетная запись теперь видима');
                            } catch {
                              toast.error('Ошибка при обновлении видимости');
                            } finally {
                              setIsUpdatingVisibility(false);
                            }
                          }}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                            isHidden ? 'bg-primary' : 'bg-slate-200'
                          } ${isUpdatingVisibility ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isHidden ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Block */}
                <div className="mt-6 flex gap-3">
                  {currentUser?.id === user.id ? (
                    isEditing ? (
                      <>
                        <button
                          onClick={handleSubmitChange}
                          disabled={isSubmitting}
                          className={`flex-1 btn-primary py-3 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                    )
                  ) : (
                    <button
                      onClick={() => setIsReportModalOpen(true)}
                      className="btn-secondary px-6 py-3 gap-2"
                    >
                      <Edit className="h-4 w-4" strokeWidth={1.5} />
                      Предложить исправление
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {isReportModalOpen && (
            <ReportModal
              user={user}
              onClose={() => setIsReportModalOpen(false)}
            />
          )}
    </>
  );
}
