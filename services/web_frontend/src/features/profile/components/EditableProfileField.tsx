import { useState } from 'react';
import { Clock, Copy, Check } from 'lucide-react';
import { IMaskInput } from 'react-imask';
import { copyToClipboard } from '@/utils/clipboard';

interface EditableProfileFieldProps {
  icon: React.ElementType;
  label: string;
  value: string;
  pendingValue?: string;
  isEditing?: boolean;
  onChange?: (value: string) => void;
  placeholder?: string;
  mask?: string;
  hint?: string;
}

function renderValue(value: string) {
  return value.trim() || (
    <span className="inline-flex items-center rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-medium text-muted-foreground/70">
      Не указано
    </span>
  );
}

export function EditableProfileField({
  icon: Icon,
  label,
  value,
  pendingValue,
  isEditing,
  onChange,
  placeholder = 'Не указано',
  mask,
  hint,
}: EditableProfileFieldProps) {
  const [copied, setCopied] = useState(false);
  const hasValue = Boolean(value.trim());

  const handleCopy = async () => {
    if (!hasValue || isEditing) return;
    const ok = await copyToClipboard(value.trim(), label);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="group relative flex items-center justify-between gap-3 rounded-xl border border-white/60 bg-white/60 p-4 transition-colors">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Icon className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.5} />
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs text-muted-foreground">{label}</p>
          {pendingValue !== undefined ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm text-foreground line-through opacity-50">{renderValue(value)}</span>
              <span className="truncate text-sm font-medium text-foreground">{renderValue(pendingValue)}</span>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                <Clock className="h-3 w-3" /> На рассмотрении
              </span>
            </div>
          ) : isEditing && onChange ? (
            <div>
              {mask ? (
                <IMaskInput
                  mask={mask}
                  value={value}
                  unmask={false}
                  onAccept={(val: string) => onChange(val)}
                  placeholder={placeholder}
                  className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40 transition-colors"
                />
              ) : (
                <input
                  type="text"
                  value={value}
                  onChange={(event) => onChange(event.target.value)}
                  placeholder={placeholder}
                  className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40 transition-colors"
                />
              )}
              {hint && (
                <p className="mt-1 text-[11px] text-muted-foreground/75 tracking-tight">{hint}</p>
              )}
            </div>
          ) : (
            <p className="truncate text-sm text-foreground">{renderValue(value)}</p>
          )}
        </div>
      </div>

      {!isEditing && hasValue && (
        <button
          type="button"
          aria-label={`Скопировать ${label.toLowerCase()}: ${value}`}
          onClick={handleCopy}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-black/5 hover:text-foreground focus-visible:opacity-100 ${
            copied ? 'text-emerald-600 bg-emerald-50 opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {copied ? <Check className="h-3.5 w-3.5" strokeWidth={2.2} /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />}
        </button>
      )}
    </div>
  );
}
