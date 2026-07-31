import { Clock } from 'lucide-react';

interface EditableProfileFieldProps {
  icon: React.ElementType;
  label: string;
  value: string;
  pendingValue?: string;
  isEditing?: boolean;
  onChange?: (value: string) => void;
  placeholder?: string;
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
}: EditableProfileFieldProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/60 bg-white/60 p-4">
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
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        ) : (
          <p className="truncate text-sm text-foreground">{renderValue(value)}</p>
        )}
      </div>
    </div>
  );
}
