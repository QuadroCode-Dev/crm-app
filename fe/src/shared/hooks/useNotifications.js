import { useContext } from 'react';
import { NotificationContext } from '../../app/providers/NotificationProvider.jsx';

function useNotifications() {
  return useContext(NotificationContext);
}

export default useNotifications;
