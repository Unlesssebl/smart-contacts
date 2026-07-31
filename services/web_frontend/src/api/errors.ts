import axios from 'axios';

export function getErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isCanceledRequest(error: unknown): boolean {
  if (axios.isCancel(error)) return true;
  if (!(error instanceof Error)) return false;
  return error.name === 'AbortError' || error.name === 'CanceledError' || error.message.includes('abort');
}
