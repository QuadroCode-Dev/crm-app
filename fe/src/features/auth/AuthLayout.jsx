import { Box, Container, Stack } from '@mui/material';
import { Outlet } from 'react-router-dom';
import './auth.css';

function AuthLayout() {
  return (
    <Box className="crm-auth-layout">
      <Container maxWidth="md">
        <Stack spacing={3} className="crm-auth-layout__stack">
          <Outlet />
        </Stack>
      </Container>
    </Box>
  );
}

export default AuthLayout;
