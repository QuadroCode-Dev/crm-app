export function normalizeApiError(error) {
  if (!error) {
    return {
      message: 'Something went wrong.',
      status: null,
      details: null,
    };
  }

  const status = error.response?.status ?? null;
  const data = error.response?.data ?? null;
  const message =
    data?.message ||
    data?.title ||
    error.message ||
    'Something went wrong.';

  return {
    message,
    status,
    details: data,
  };
}
