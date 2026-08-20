import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight, ChevronsUpDown, Loader2, Palette, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi, type ADOrganizationalUnitTree, type OUMappingValue } from '@/api/settings';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/components/ui/utils';
import { DEFAULT_ORGANIZATION_COLOR, hashOrganizationColor, ORGANIZATION_COLORS } from '@/theme/organizationColors';

interface OuMappingPanelProps {
  mapping: Record<string, OUMappingValue>;
  onSave: (mapping: Record<string, OUMappingValue>) => Promise<void>;
}

interface MappingRow extends OUMappingValue {
  ou: string;
}

const organizationKey = (organization: string) => organization.trim().toLocaleLowerCase('ru-RU');
const COLOR_BY_VALUE = new Map(ORGANIZATION_COLORS.map((color) => [color.value, color]));

interface ColorSelectProps {
  value: string;
  context: string;
  onChange: (context: string, value: string) => void;
  className?: string;
}

const ColorSelect = memo(function ColorSelect({ value, context, onChange, className = '' }: ColorSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOptionRef = useRef<HTMLButtonElement>(null);
  const selectedColor = COLOR_BY_VALUE.get(value) ?? ORGANIZATION_COLORS[0];

  return (
    <Popover
      open={isOpen}
      onOpenChange={setIsOpen}
      modal={false}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm transition-[color,box-shadow] outline-none hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            className,
          )}
          aria-label="Цвет предприятия"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: selectedColor.value }}
            />
            <span className="truncate">{selectedColor.label}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      {isOpen && (
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] min-w-52 p-1"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            selectedOptionRef.current?.focus({ preventScroll: true });
          }}
        >
          <div
            className="max-h-[min(18rem,var(--radix-popover-content-available-height))] overflow-y-auto overscroll-contain"
            role="listbox"
            aria-label="Палитра предприятия"
          >
            {ORGANIZATION_COLORS.map((color) => {
              const isSelected = color.value === value;
              return (
                <button
                  key={color.value}
                  ref={isSelected ? selectedOptionRef : undefined}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:bg-accent',
                    isSelected && 'bg-accent/70 font-medium',
                  )}
                  onClick={() => {
                    onChange(context, color.value);
                    setIsOpen(false);
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: color.value }}
                  />
                  <span className="min-w-0 flex-1 truncate">{color.label}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
});

interface OuTreeNodeProps {
  name: string;
  node: ADOrganizationalUnitTree;
  path: string;
  selectedPath: string;
  usedOus: Set<string>;
  onSelect: (path: string) => void;
}

function OuTreeNode({ name, node, path, selectedPath, usedOus, onSelect }: OuTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const children = Object.keys(node).sort((left, right) => left.localeCompare(right, 'ru'));
  const hasChildren = children.length > 0;
  const isSelected = selectedPath === path;
  const isUsed = usedOus.has(name);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={`flex min-h-9 items-center gap-1 rounded-md px-1.5 transition-colors ${
          isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60'
        } ${isUsed ? 'opacity-45 hover:bg-transparent' : ''}`}
      >
        {hasChildren ? (
          <button
            type="button"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              setIsOpen((current) => !current);
            }}
            aria-label={isOpen ? `Свернуть ${name}` : `Раскрыть ${name}`}
            aria-expanded={isOpen}
          >
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="h-7 w-7 shrink-0" aria-hidden="true" />
        )}
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 self-stretch rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onSelect(path)}
          role="option"
          aria-selected={isSelected}
          disabled={isUsed}
          title={isUsed ? `${name} уже добавлен` : path}
        >
          <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
          {isUsed && <span className="shrink-0 text-[11px] text-muted-foreground">Добавлен</span>}
          {isSelected && <Check className="h-4 w-4 shrink-0" />}
        </button>
      </div>

      {hasChildren && (
        <CollapsibleContent>
          <div className="ml-5 border-l pl-2">
            {children.map((childName) => (
              <OuTreeNode
                key={childName}
                name={childName}
                node={node[childName]}
                path={`${path}/${childName}`}
                selectedPath={selectedPath}
                usedOus={usedOus}
                onSelect={onSelect}
              />
            ))}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

export function OuMappingPanel({ mapping, onSave }: OuMappingPanelProps) {
  const [rows, setRows] = useState<MappingRow[]>([]);
  const [ouTree, setOuTree] = useState<ADOrganizationalUnitTree>({});
  const [newOu, setNewOu] = useState('');
  const [newOrg, setNewOrg] = useState('');
  const [newColor, setNewColor] = useState<string>(DEFAULT_ORGANIZATION_COLOR);
  const [isNewColorManual, setIsNewColorManual] = useState(false);
  const [selectedOrganizations, setSelectedOrganizations] = useState<Set<string>>(new Set());
  const [bulkColor, setBulkColor] = useState<string>(DEFAULT_ORGANIZATION_COLOR);
  const [isLoading, setIsLoading] = useState(true);
  const [ouLoadError, setOuLoadError] = useState(false);
  const [isOuPickerOpen, setIsOuPickerOpen] = useState(false);

  useEffect(() => {
    setRows(Object.entries(mapping).map(([ou, value]) => ({ ou, ...value })));
  }, [mapping]);

  useEffect(() => {
    settingsApi.getADOus()
      .then(setOuTree)
      .catch(() => {
        setOuLoadError(true);
        toast.warning('Список OU недоступен — можно ввести значение вручную');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const rootOus = useMemo(() => Object.keys(ouTree).sort((left, right) => left.localeCompare(right, 'ru')), [ouTree]);
  const usedOus = useMemo(() => new Set(rows.map((row) => row.ou)), [rows]);
  const hasOuTree = rootOus.length > 0;
  const organizations = useMemo(() => {
    const unique = new Map<string, string>();
    rows.forEach((row) => {
      const key = organizationKey(row.org);
      if (key && !unique.has(key)) unique.set(key, row.org.trim());
    });
    return unique;
  }, [rows]);
  const allOrganizationsSelected = organizations.size > 0 && selectedOrganizations.size === organizations.size;
  const someOrganizationsSelected = selectedOrganizations.size > 0 && !allOrganizationsSelected;

  useEffect(() => {
    setSelectedOrganizations((current) => {
      const valid = new Set([...current].filter((key) => organizations.has(key)));
      return valid.size === current.size ? current : valid;
    });
  }, [organizations]);

  const addRow = () => {
    const ou = newOu.split('/').at(-1)?.trim() || '';
    if (!ou || !newOrg.trim()) return toast.error('Заполните OU и название организации');
    if (rows.some((row) => row.ou === ou)) return toast.error('Такой OU уже добавлен');
    const existingOrganization = rows.find((row) => organizationKey(row.org) === organizationKey(newOrg));
    setRows((current) => [...current, { ou, org: newOrg.trim(), color: existingOrganization?.color ?? newColor }]);
    setNewOu('');
    setNewOrg('');
    setNewColor(DEFAULT_ORGANIZATION_COLOR);
    setIsNewColorManual(false);
  };

  const toggleOrganization = (organization: string) => {
    const key = organizationKey(organization);
    setSelectedOrganizations((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const applyBulkColor = () => {
    if (selectedOrganizations.size === 0) return;
    setRows((current) => current.map((row) => (
      selectedOrganizations.has(organizationKey(row.org)) ? { ...row, color: bulkColor } : row
    )));
    toast.success(`Цвет назначен: ${selectedOrganizations.size} ${selectedOrganizations.size === 1 ? 'предприятие' : 'предприятий'}`);
  };

  const updateOrganizationColor = useCallback((organization: string, color: string) => {
    const key = organizationKey(organization);
    setRows((current) => current.map((row) => organizationKey(row.org) === key ? { ...row, color } : row));
  }, []);

  const updateBulkColor = useCallback((_context: string, color: string) => setBulkColor(color), []);
  const updateNewColor = useCallback((_context: string, color: string) => {
    setNewColor(color);
    setIsNewColorManual(true);
  }, []);

  const save = async () => {
    const next = Object.fromEntries(rows.map(({ ou, org, color }) => [ou, { org, color }]));
    await onSave(next);
  };

  return (
    <div className="space-y-6 p-6">
      <header>
        <h3 className="text-lg font-medium">Маппинг организаций (OU)</h3>
        <p className="mt-1 text-sm text-muted-foreground">Свяжите подразделения Active Directory с отображаемыми названиями организаций.</p>
      </header>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {selectedOrganizations.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b bg-primary/[0.04] px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Palette className="h-4 w-4 text-primary" />
              Выбрано предприятий: {selectedOrganizations.size}
            </div>
            <ColorSelect value={bulkColor} context="bulk" onChange={updateBulkColor} className="h-9 w-52" />
            <button type="button" onClick={applyBulkColor} className="btn-secondary h-9 px-4 text-sm">
              Назначить цвет
            </button>
            <button type="button" onClick={() => setSelectedOrganizations(new Set())} className="ml-auto text-sm text-muted-foreground hover:text-foreground">
              Снять выделение
            </button>
          </div>
        )}
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/50 text-muted-foreground"><tr>
            <th className="w-12 p-3">
              <Checkbox
                checked={someOrganizationsSelected ? 'indeterminate' : allOrganizationsSelected}
                onCheckedChange={(checked) => setSelectedOrganizations(checked ? new Set(organizations.keys()) : new Set())}
                aria-label="Выбрать все предприятия"
              />
            </th>
            <th className="p-3">OU</th><th className="p-3">Организация</th><th className="w-56 p-3">Цвет</th><th />
          </tr></thead>
          <tbody className="divide-y">
            {rows.map((row, index) => (
              <tr key={row.ou} className={selectedOrganizations.has(organizationKey(row.org)) ? 'bg-primary/[0.035]' : ''}>
                <td className="p-3">
                  <Checkbox
                    checked={selectedOrganizations.has(organizationKey(row.org))}
                    onCheckedChange={() => toggleOrganization(row.org)}
                    aria-label={`Выбрать предприятие ${row.org}`}
                  />
                </td>
                <td className="p-3 font-mono">{row.ou}</td>
                <td className="p-3"><input value={row.org} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, org: event.target.value } : item))} className="h-9 w-full rounded-md border bg-background px-3" /></td>
                <td className="p-3"><ColorSelect value={row.color} context={row.org} onChange={updateOrganizationColor} className="h-9" /></td>
                <td className="p-3"><button onClick={() => setRows((current) => current.filter((item) => item.ou !== row.ou))} className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Удалить ${row.ou}`}><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid gap-3 border-t bg-muted/10 p-4 md:grid-cols-[1fr_1fr_180px_auto]">
          {isLoading ? (
            <div className="flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Загрузка OU…
            </div>
          ) : hasOuTree ? (
            <Popover open={isOuPickerOpen} onOpenChange={setIsOuPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex h-10 min-w-0 items-center justify-between gap-2 rounded-md border bg-background px-3 text-left text-sm transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  title={newOu || 'Выберите OU из дерева'}
                >
                  <span className={`truncate ${newOu ? '' : 'text-muted-foreground'}`}>
                    {newOu ? newOu.split('/').at(-1) : 'Выберите OU из дерева'}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(24rem,var(--radix-popover-content-available-width))] p-2">
                <div className="mb-2 border-b px-2 pb-2">
                  <p className="text-xs font-medium text-foreground">Структура Active Directory</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Раскройте ветку и выберите подразделение</p>
                </div>
                <div className="max-h-[21rem] overflow-y-auto pr-1" role="listbox" aria-label="Дерево OU">
                  {rootOus.map((name) => (
                    <OuTreeNode
                      key={name}
                      name={name}
                      node={ouTree[name]}
                      path={name}
                      selectedPath={newOu}
                      usedOus={usedOus}
                      onSelect={(path) => {
                        setNewOu(path);
                        setIsOuPickerOpen(false);
                      }}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <div className="space-y-1">
              <input
                value={newOu}
                onChange={(event) => setNewOu(event.target.value)}
                placeholder="Введите OU вручную"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {ouLoadError && <p className="text-xs text-amber-600">Дерево AD не загружено</p>}
            </div>
          )}
          <input value={newOrg} onChange={(event) => {
            const value = event.target.value;
            setNewOrg(value);
            if (!isNewColorManual) setNewColor(value.trim() ? hashOrganizationColor(value) : DEFAULT_ORGANIZATION_COLOR);
          }} placeholder="Название организации" className="h-10 rounded-md border bg-background px-3 text-sm" />
          <ColorSelect value={newColor} context="new" onChange={updateNewColor} className="h-10" />
          <button onClick={addRow} className="btn-secondary flex h-10 items-center gap-2 px-4"><Plus className="h-4 w-4" /> Добавить</button>
        </div>
      </div>
      <button onClick={() => void save()} className="btn-primary h-10 px-5">Сохранить маппинг</button>
    </div>
  );
}
