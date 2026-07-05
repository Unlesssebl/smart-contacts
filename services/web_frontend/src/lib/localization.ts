export const getEmployeeWord = (count: number) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'сотрудников';
  if (mod10 === 1) return 'сотрудник';
  if (mod10 >= 2 && mod10 <= 4) return 'сотрудника';
  return 'сотрудников';
};

export const getChangeWord = (count: number) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'изменений';
  if (mod10 === 1) return 'изменение';
  if (mod10 >= 2 && mod10 <= 4) return 'изменения';
  return 'изменений';
};

export const getAttributeLabel = (name: string) => {
  const labels: Record<string, string> = {
    job_title: 'должность',
    department: 'отдел',
    email: 'email',
    internal_phone: 'внутренний телефон',
    mobile_phone: 'мобильный телефон',
    office_location: 'офис / расположение',
  };
  return labels[name] || name.replace('_', ' ');
};

export const getStatusLabel = (status: string) => {
  const statuses: Record<string, string> = {
    resolved: 'Решено',
    in_progress: 'В работе',
    pending: 'Ожидает',
    open: 'Открыто',
  };
  return statuses[status] || status.replace('_', ' ');
};
