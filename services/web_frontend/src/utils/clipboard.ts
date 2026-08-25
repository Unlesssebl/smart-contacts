import { toast } from 'sonner';

export const copyToClipboard = async (text: string, label?: string): Promise<boolean> => {
  if (!text || !text.trim()) return false;

  let success = false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      success = true;
    }
  } catch (err) {
    console.warn('Navigator clipboard failed, trying fallback...', err);
  }

  if (!success) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      success = document.execCommand('copy');
    } catch (err) {
      console.error('Fallback copy failed', err);
      success = false;
    } finally {
      document.body.removeChild(textArea);
    }
  }

  if (success) {
    if (label) {
      toast.success(`${label} скопирован: ${text}`);
    } else {
      toast.success(`Скопировано: ${text}`);
    }
  } else {
    toast.error('Не удалось скопировать в буфер обмена');
  }

  return success;
};
