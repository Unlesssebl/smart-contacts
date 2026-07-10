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
    approved: 'Одобрено',
    rejected: 'Отклонено',
    applied: 'Применено в AD',
    conflict: 'Ошибка применения',
  };
  return statuses[status] || status.replace('_', ' ');
};

export const getLdapErrorTranslation = (errorMsg: string | null | undefined): string => {
  if (!errorMsg) return 'Неизвестная ошибка';
  
  const msg = errorMsg.toLowerCase();
  if (msg.includes('insufficientaccessrights')) {
    return 'Недостаточно прав. Сервисная учетная запись не имеет прав на запись атрибутов для этого пользователя.';
  }
  if (msg.includes('invalidcredentials') || msg.includes('data 52e')) {
    return 'Неверные учетные данные (логин или пароль).';
  }
  if (msg.includes('nosuchobject')) {
    return 'Пользователь или объект не найден в Active Directory.';
  }
  if (msg.includes('constraintviolation')) {
    return 'Нарушение ограничений (значение не соответствует политикам AD).';
  }
  if (msg.includes('alreadyexists')) {
    return 'Объект с таким значением уже существует.';
  }
  if (msg.includes('invalidattributesyntax')) {
    return 'Синтаксическая ошибка. Недопустимое значение атрибута (возможно, попытка записать пустую строку вместо удаления).';
  }
  if (msg.includes('operationserror')) {
    return 'Внутренняя ошибка выполнения операции в Active Directory.';
  }
  
  return errorMsg;
};
