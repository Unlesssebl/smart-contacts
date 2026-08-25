import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { LDAPSettings } from '@/api/settings';
import { getLdapErrorTranslation } from '@/lib/localization';

interface LdapSettingsPanelProps {
  settings: LDAPSettings | null;
  onSave: (settings: LDAPSettings) => Promise<void>;
  onForceSync: () => Promise<void>;
}

export function LdapSettingsPanel({ settings, onSave, onForceSync }: LdapSettingsPanelProps) {
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const user = formData.get('ad_user');
    const password = formData.get('ad_password');
    const payload: LDAPSettings = {};

    if (typeof user === 'string') payload.ad_user = user;
    if (typeof password === 'string' && password) payload.ad_password = password;
    await onSave(payload);
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex max-w-xl items-center justify-between border-b pb-6">
        <div>
          <h3 className="text-lg font-medium">Ручная синхронизация</h3>
          <p className="mt-1 text-sm text-muted-foreground">Принудительно запустить цикл синхронизации с Active Directory.</p>
        </div>
        <button type="button" onClick={() => void onForceSync()} className="btn-secondary h-9 shrink-0 px-4">
          Запустить синхронизацию
        </button>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
        <div>
          <h3 className="text-lg font-medium">Учётная запись Active Directory</h3>
          <p className="mb-4 text-sm text-muted-foreground">Данные сервисной учётной записи сохраняются в зашифрованном виде.</p>
        </div>

        {settings?.status === 'ok' && (
          <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/15 p-3 text-sm text-green-600">
            <CheckCircle2 className="h-5 w-5" /> Подключение установлено успешно.
          </div>
        )}
        {settings?.status === 'error' && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/15 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div><strong>Ошибка подключения:</strong> {getLdapErrorTranslation(settings.last_error)}</div>
          </div>
        )}

        <label className="block space-y-2 text-sm font-medium">
          <span>Имя пользователя (UPN или DN)</span>
          <input name="ad_user" type="text" defaultValue={settings?.ad_user || ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          <span>Пароль {settings?.is_password_set && '(уже установлен)'}</span>
          <input name="ad_password" type="password" placeholder={settings?.is_password_set ? 'Оставьте пустым, чтобы не менять' : 'Введите пароль'} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </label>
        <button type="submit" className="btn-primary h-10 px-4">Сохранить настройки</button>
      </form>
    </div>
  );
}
