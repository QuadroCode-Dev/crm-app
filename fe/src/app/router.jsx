import { Navigate, RouterProvider, createBrowserRouter, createMemoryRouter } from 'react-router-dom';
import AuthLayout from '../features/auth/AuthLayout.jsx';
import LoginPage from '../features/auth/LoginPage.jsx';
import ProtectedRoute from '../features/auth/ProtectedRoute.jsx';
import PublicOnlyRoute from '../features/auth/PublicOnlyRoute.jsx';
import DashboardPage from '../features/dashboard/DashboardPage.jsx';
import HelpPage from '../features/help/HelpPage.jsx';
import ContactsPage from '../features/contacts/ContactsPage.jsx';
import ContactDetailPage from '../features/contacts/ContactDetailPage.jsx';
import LandingPage from '../features/landing/LandingPage.jsx';
import LeadCaptureSuccessPage from '../features/landing/LeadCaptureSuccessPage.jsx';
import PublicLayout from '../features/landing/PublicLayout.jsx';
import LeadsPage from '../features/leads/LeadsPage.jsx';
import LeadDetailPage from '../features/leads/LeadDetailPage.jsx';
import PipelinePage from '../features/pipeline/PipelinePage.jsx';
import ReportsPage from '../features/reports/ReportsPage.jsx';
import SettingsAutomationPage from '../features/settings/SettingsAutomationPage.jsx';
import SettingsCustomizationPage from '../features/settings/SettingsCustomizationPage.jsx';
import SettingsIntegrationsPage from '../features/settings/SettingsIntegrationsPage.jsx';
import SettingsPipelinePage from '../features/settings/SettingsPipelinePage.jsx';
import SettingsServicesPage from '../features/settings/SettingsServicesPage.jsx';
import TasksPage from '../features/tasks/TasksPage.jsx';
import UsersManagementPage from '../features/users-management/UsersManagementPage.jsx';
import AppLayout from '../shared/layout/AppLayout.jsx';

function AppRouter() {
  return <RouterProvider router={createAppRouter()} />;
}

export const appRoutes = [
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    element: <AuthLayout />,
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          {
            path: '/login',
            element: <LoginPage />,
          },
        ],
      },
    ],
  },
  {
    element: <PublicLayout />,
    children: [
      {
        path: '/landing',
        element: <LandingPage />,
      },
      {
        path: '/lead-capture-success',
        element: <LeadCaptureSuccessPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/dashboard',
            element: <DashboardPage />,
          },
          {
            path: '/pipeline',
            element: <PipelinePage />,
          },
          {
            path: '/leads',
            element: <LeadsPage />,
          },
          {
            path: '/leads/:id',
            element: <LeadDetailPage />,
          },
          {
            path: '/contacts',
            element: <ContactsPage />,
          },
          {
            path: '/contacts/:id',
            element: <ContactDetailPage />,
          },
          {
            path: '/tasks',
            element: <TasksPage />,
          },
          {
            path: '/reports',
            element: <ReportsPage />,
          },
          {
            path: '/help',
            element: <HelpPage />,
          },
          {
            path: '/settings/pipeline',
            element: <SettingsPipelinePage />,
          },
          {
            path: '/settings/automation',
            element: <SettingsAutomationPage />,
          },
          {
            path: '/settings/integrations',
            element: <SettingsIntegrationsPage />,
          },
          {
            path: '/settings/services',
            element: <SettingsServicesPage />,
          },
          {
            path: '/settings/customization',
            element: <SettingsCustomizationPage />,
          },
          {
            path: '/users-management',
            element: <UsersManagementPage />,
          },
        ],
      },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}

export function createTestRouter(initialEntries = ['/dashboard']) {
  return createMemoryRouter(appRoutes, {
    initialEntries,
  });
}

export default AppRouter;
