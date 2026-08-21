import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { UserGuidesModal } from '@/components/UserGuidesModal';
import { SupportModal } from '@/components/SupportModal';

const ONBOARDING_STORAGE_KEY = 'smart_contacts_onboarding_completed';

export function OnboardingGuide() {
  const currentUser = useAppStore((state) => state.currentUser);
  const [isOpen, setIsOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    try {
      // Check if onboarding was already shown or completed
      const hasCompleted = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!hasCompleted) {
        // Delay slightly to allow initial layout animation to settle
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore
    }
  }, [currentUser]);

  const handleClose = () => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
    setIsOpen(false);
  };

  const handleOpenSupport = () => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
    setIsSupportOpen(true);
  };

  if (!currentUser) return null;

  return (
    <>
      <UserGuidesModal
        isOpen={isOpen}
        onClose={handleClose}
        initialMode="tour"
        onOpenSupport={handleOpenSupport}
      />
      {isSupportOpen && <SupportModal onClose={() => setIsSupportOpen(false)} />}
    </>
  );
}
