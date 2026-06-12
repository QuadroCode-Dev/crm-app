export async function enableMocking() {
  if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_API_MOCKS !== 'true') {
    return;
  }

  const { worker } = await import('./browser.js');

  await worker.start({
    onUnhandledRequest: 'bypass',
  });
}
