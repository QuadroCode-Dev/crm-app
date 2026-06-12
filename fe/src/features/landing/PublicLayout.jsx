import { Box, Container } from '@mui/material';
import { Outlet } from 'react-router-dom';
import './landing.css';

function PublicLayout() {
  return (
    <Box className="crm-public-layout">
      <Box className="crm-public-layout__backdrop" />
      <Container maxWidth="lg" className="crm-public-layout__container">
        <Outlet />
      </Container>
    </Box>
  );
}

export default PublicLayout;
