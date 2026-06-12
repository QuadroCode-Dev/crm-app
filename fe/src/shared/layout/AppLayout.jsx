import { Box, Drawer, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import useLanguage from '../hooks/useLanguage.js';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import './layout.css';

function AppLayout() {
  const theme = useTheme();
  const { direction } = useLanguage();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerAnchor = direction === 'rtl' ? 'right' : 'left';

  useEffect(() => {
    if (isDesktop) {
      setMobileOpen(false);
    }
  }, [isDesktop]);

  function handleToggleMenu() {
    setMobileOpen((currentValue) => !currentValue);
  }

  function handleCloseMenu() {
    setMobileOpen(false);
  }

  return (
    <Box className="crm-app-layout">
      {isDesktop ? (
        <Drawer
          anchor={drawerAnchor}
          open
          variant="permanent"
          className="crm-app-layout__drawer"
          PaperProps={{
            className: 'crm-app-layout__drawer-paper',
            dir: direction,
          }}
        >
          <Sidebar />
        </Drawer>
      ) : (
        <Drawer
          anchor={drawerAnchor}
          open={mobileOpen}
          variant="temporary"
          onClose={handleCloseMenu}
          className="crm-app-layout__drawer crm-app-layout__drawer--mobile"
          ModalProps={{ keepMounted: true }}
          PaperProps={{
            className: 'crm-app-layout__drawer-paper',
            dir: direction,
          }}
        >
          <Sidebar onNavigate={handleCloseMenu} />
        </Drawer>
      )}
      <Box component="section" className="crm-app-layout__content">
        <Topbar onToggleMenu={handleToggleMenu} showMenuButton={!isDesktop} />
        <Toolbar />
        <Box className="crm-app-layout__content-inner">
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

export default AppLayout;
