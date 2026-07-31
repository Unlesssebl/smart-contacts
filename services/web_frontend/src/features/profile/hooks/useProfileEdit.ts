import { useEffect, useMemo, useState } from 'react';
import type { User } from '@/types';
import { cleanProfileValue } from '../lib/profileValues';

interface ChangeRequestInput {
  attribute_name: 'mobile_phone' | 'office_location';
  new_value: string;
}

interface UseProfileEditOptions {
  user: User | null;
  pendingFields: Record<string, string> | null;
  addChangeRequest: (request: ChangeRequestInput) => Promise<void>;
}

export function useProfileEdit({ user, pendingFields, addChangeRequest }: UseProfileEditOptions) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobilePhone, setMobilePhone] = useState('');
  const [officeLocation, setOfficeLocation] = useState('');

  const reset = () => {
    setMobilePhone(cleanProfileValue(user?.mobile_phone));
    setOfficeLocation(cleanProfileValue(user?.office_location));
  };

  useEffect(() => {
    setMobilePhone(cleanProfileValue(user?.mobile_phone));
    setOfficeLocation(cleanProfileValue(user?.office_location));
  }, [user]);

  const hasChanges = useMemo(
    () => Boolean(user) && (
      mobilePhone !== cleanProfileValue(user?.mobile_phone)
      || officeLocation !== cleanProfileValue(user?.office_location)
    ),
    [mobilePhone, officeLocation, user],
  );

  const submit = async () => {
    if (!user || !pendingFields || isSubmitting || !hasChanges) return false;

    setIsSubmitting(true);
    let succeeded = true;

    const changes: ChangeRequestInput[] = [];
    if (mobilePhone !== cleanProfileValue(user.mobile_phone) && !('mobile_phone' in pendingFields)) {
      changes.push({ attribute_name: 'mobile_phone', new_value: mobilePhone });
    }
    if (officeLocation !== cleanProfileValue(user.office_location) && !('office_location' in pendingFields)) {
      changes.push({ attribute_name: 'office_location', new_value: officeLocation });
    }

    for (const change of changes) {
      try {
        await addChangeRequest(change);
      } catch {
        succeeded = false;
      }
    }

    setIsSubmitting(false);
    if (succeeded) {
      setIsEditing(false);
      reset();
    }
    return succeeded;
  };

  return {
    isEditing,
    setIsEditing,
    isSubmitting,
    mobilePhone,
    setMobilePhone,
    officeLocation,
    setOfficeLocation,
    hasChanges,
    reset,
    submit,
  };
}
