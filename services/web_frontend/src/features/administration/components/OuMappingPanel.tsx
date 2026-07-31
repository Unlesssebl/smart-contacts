import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi, type ADOrganizationalUnitTree, type OUMappingValue } from '@/api/settings';

interface OuMappingPanelProps {
  mapping: Record<string, OUMappingValue>;
  onSave: (mapping: Record<string, OUMappingValue>) => Promise<void>;
}

interface MappingRow extends OUMappingValue {
  ou: string;
}

const COLORS = [
  { label: 'Синий', value: 'bg-blue-50 text-blue-700 ring-blue-700/10' },
  { label: 'Индиго', value: 'bg-indigo-50 text-indigo-700 ring-indigo-700/10' },
  { label: 'Фиолетовый', value: 'bg-purple-50 text-purple-700 ring-purple-700/10' },
  { label: 'Розовый', value: 'bg-pink-50 text-pink-700 ring-pink-700/10' },
  { label: 'Красный', value: 'bg-red-50 text-red-700 ring-red-700/10' },
  { label: 'Оранжевый', value: 'bg-orange-50 text-orange-700 ring-orange-700/10' },
  { label: 'Зелёный', value: 'bg-green-50 text-green-700 ring-green-600/20' },
  { label: 'Серый', value: 'bg-slate-50 text-slate-700 ring-slate-600/20' },
] as const;

function flattenOuTree(tree: ADOrganizationalUnitTree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([name, children]) => {
    const path = prefix ? `${prefix}/${name}` : name;
    return [path, ...flattenOuTree(children, path)];
  });
}

export function OuMappingPanel({ mapping, onSave }: OuMappingPanelProps) {
  const [rows, setRows] = useState<MappingRow[]>([]);
  const [ouTree, setOuTree] = useState<ADOrganizationalUnitTree>({});
  const [newOu, setNewOu] = useState('');
  const [newOrg, setNewOrg] = useState('');
  const [newColor, setNewColor] = useState<string>(COLORS[0].value);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setRows(Object.entries(mapping).map(([ou, value]) => ({ ou, ...value })));
  }, [mapping]);

  useEffect(() => {
    settingsApi.getADOus()
      .then(setOuTree)
      .catch(() => toast.warning('Список OU недоступен — можно ввести значение вручную'))
      .finally(() => setIsLoading(false));
  }, []);

  const availablePaths = useMemo(() => {
    const used = new Set(rows.map((row) => row.ou));
    return flattenOuTree(ouTree).filter((path) => !used.has(path.split('/').at(-1) || ''));
  }, [ouTree, rows]);

  const addRow = () => {
    const ou = newOu.split('/').at(-1)?.trim() || '';
    if (!ou || !newOrg.trim()) return toast.error('Заполните OU и название организации');
    if (rows.some((row) => row.ou === ou)) return toast.error('Такой OU уже добавлен');
    setRows((current) => [...current, { ou, org: newOrg.trim(), color: newColor }]);
    setNewOu('');
    setNewOrg('');
  };

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
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/50 text-muted-foreground"><tr><th className="p-3">OU</th><th className="p-3">Организация</th><th className="p-3">Цвет</th><th /></tr></thead>
          <tbody className="divide-y">
            {rows.map((row, index) => (
              <tr key={row.ou}>
                <td className="p-3 font-mono">{row.ou}</td>
                <td className="p-3"><input value={row.org} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, org: event.target.value } : item))} className="h-9 w-full rounded-md border bg-background px-3" /></td>
                <td className="p-3"><select value={row.color} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, color: event.target.value } : item))} className="h-9 rounded-md border bg-background px-2">{COLORS.map((color) => <option key={color.value} value={color.value}>{color.label}</option>)}</select></td>
                <td className="p-3"><button onClick={() => setRows((current) => current.filter((item) => item.ou !== row.ou))} className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Удалить ${row.ou}`}><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid gap-3 border-t bg-muted/10 p-4 md:grid-cols-[1fr_1fr_180px_auto]">
          <input list="available-ou" value={newOu} onChange={(event) => setNewOu(event.target.value)} placeholder={isLoading ? 'Загрузка OU…' : 'Выберите или введите OU'} className="h-10 rounded-md border bg-background px-3 text-sm" />
          <datalist id="available-ou">{availablePaths.map((path) => <option key={path} value={path} />)}</datalist>
          <input value={newOrg} onChange={(event) => setNewOrg(event.target.value)} placeholder="Название организации" className="h-10 rounded-md border bg-background px-3 text-sm" />
          <select value={newColor} onChange={(event) => setNewColor(event.target.value)} className="h-10 rounded-md border bg-background px-2 text-sm">{COLORS.map((color) => <option key={color.value} value={color.value}>{color.label}</option>)}</select>
          <button onClick={addRow} className="btn-secondary flex h-10 items-center gap-2 px-4"><Plus className="h-4 w-4" /> Добавить</button>
        </div>
      </div>
      <button onClick={() => void save()} className="btn-primary h-10 px-5">Сохранить маппинг</button>
    </div>
  );
}
