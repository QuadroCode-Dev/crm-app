export const LANDING_SUCCESS_STORAGE_KEY = 'crm.public.leadCapture';

export function saveLeadCaptureSuccess(payload) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(LANDING_SUCCESS_STORAGE_KEY, JSON.stringify(payload));
}

export function getLeadCaptureSuccess() {
  if (typeof window === 'undefined') {
    return null;
  }

  const value = window.sessionStorage.getItem(LANDING_SUCCESS_STORAGE_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
