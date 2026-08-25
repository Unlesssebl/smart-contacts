import axios from 'axios';

export function getErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

export function getErrorMessage(error: unknown, defaultMessage = 'Произошла непредвиденная ошибка'): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0 && detail[0]?.msg) {
      return detail[0].msg;
    }
  }
  return error instanceof Error ? error.message : defaultMessage;
}

export function isCanceledRequest(error: unknown): boolean {
  if (axios.isCancel(error)) return true;
  if (!(error instanceof Error)) return false;
  return error.name === 'AbortError' || error.name === 'CanceledError' || error.message.includes('abort');
}

