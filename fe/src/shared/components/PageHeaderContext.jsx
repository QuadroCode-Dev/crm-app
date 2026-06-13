import { createContext, useContext, useMemo, useState } from 'react';

const defaultPageHeader = {
  actions: null,
  description: '',
  title: '',
};

const PageHeaderStateContext = createContext(defaultPageHeader);
const PageHeaderDispatchContext = createContext(null);

export function PageHeaderProvider({ children }) {
  const [pageHeader, setPageHeader] = useState(defaultPageHeader);

  const dispatchValue = useMemo(
    () => ({
      setPageHeader,
    }),
    [],
  );

  return (
    <PageHeaderDispatchContext.Provider value={dispatchValue}>
      <PageHeaderStateContext.Provider value={pageHeader}>
        {children}
      </PageHeaderStateContext.Provider>
    </PageHeaderDispatchContext.Provider>
  );
}

export function usePageHeader() {
  return useContext(PageHeaderStateContext);
}

export function usePageHeaderDispatch() {
  const context = useContext(PageHeaderDispatchContext);

  if (!context) {
    throw new Error('usePageHeaderDispatch must be used within PageHeaderProvider');
  }

  return context;
}
