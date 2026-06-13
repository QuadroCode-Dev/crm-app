import { useEffect } from 'react';
import { usePageHeaderDispatch } from './PageHeaderContext.jsx';
import './shared-components.css';

function PageHeader({ title, description, actions = null }) {
  const { setPageHeader } = usePageHeaderDispatch();

  useEffect(() => {
    setPageHeader({
      actions,
      description: description || '',
      title: title || '',
    });

    return () => {
      setPageHeader({
        actions: null,
        description: '',
        title: '',
      });
    };
  }, [actions, description, setPageHeader, title]);

  return null;
}

export default PageHeader;
