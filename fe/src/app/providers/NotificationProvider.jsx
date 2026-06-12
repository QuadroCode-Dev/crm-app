import { Alert, Snackbar } from '@mui/material';
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import '../../shared/components/shared-components.css';

export const NotificationContext = createContext({
  showNotification: () => {},
});

function NotificationProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [queue, setQueue] = useState([]);

  const showNotification = useCallback((options) => {
    const nextNotification = {
      severity: options.severity || 'info',
      message: options.message,
    };

    if (open || notification) {
      setQueue((currentQueue) => [...currentQueue, nextNotification]);
      return;
    }

    setNotification(nextNotification);
    setOpen(true);
  }, [notification, open]);

  useEffect(() => {
    if (!notification && queue.length > 0) {
      setNotification(queue[0]);
      setQueue((currentQueue) => currentQueue.slice(1));
      setOpen(true);
    }
  }, [notification, queue]);

  function handleClose(_event, reason) {
    if (reason === 'clickaway') {
      return;
    }

    setOpen(false);
  }

  function handleExited() {
    setNotification(null);
  }

  const value = useMemo(
    () => ({
      showNotification,
    }),
    [showNotification],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Snackbar
        autoHideDuration={4000}
        onClose={handleClose}
        open={open}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        className="crm-snackbar"
        TransitionProps={{
          onExited: handleExited,
        }}
      >
        <Alert
          severity={notification?.severity || 'info'}
          onClose={handleClose}
          variant="filled"
          className="crm-snackbar__alert"
        >
          {notification?.message || ''}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export default NotificationProvider;
