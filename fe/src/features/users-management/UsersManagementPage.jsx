import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  createUser,
  getPermissions,
  getRoles,
  getUsers,
  updateRolePermissions,
  updateUser,
} from '../../api/usersManagementApi.js';
import { normalizeApiError } from '../../api/normalizeApiError.js';
import PageHeader from '../../shared/components/PageHeader.jsx';
import ErrorState from '../../shared/components/feedback/ErrorState.jsx';
import LoadingState from '../../shared/components/feedback/LoadingState.jsx';
import useLanguage from '../../shared/hooks/useLanguage.js';
import useNotifications from '../../shared/hooks/useNotifications.js';
import './users-management.css';

const emptyUserForm = {
  fullName: '',
  email: '',
  password: '',
  role: 'Agent',
  isActive: true,
};

function UserFormDialog({ open, user, roleOptions, onClose, onSubmit }) {
  const { t } = useLanguage();
  const [values, setValues] = useState(emptyUserForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setValues({
      fullName: user?.fullName || '',
      email: user?.email || '',
      password: '',
      role: user?.role || 'Agent',
      isActive: user?.isActive ?? true,
    });
    setErrors({});
  }, [user, open]);

  function updateField(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  }

  function validate() {
    const nextErrors = {};

    if (!values.fullName.trim()) {
      nextErrors.fullName = t('Full name is required.');
    }

    if (!values.email.trim() || !values.email.includes('@')) {
      nextErrors.email = t('Valid email is required.');
    }

    if (!user && values.password.length < 8) {
      nextErrors.password = t('Password must be at least 8 characters.');
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) {
      return;
    }

    const payload = {
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      role: values.role,
      isActive: values.isActive,
    };

    if (!user) {
      payload.password = values.password;
    }

    onSubmit(payload);
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{user ? t('Edit user') : t('Create user')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label={t('Full name')}
            value={values.fullName}
            onChange={(event) => updateField('fullName', event.target.value)}
            error={Boolean(errors.fullName)}
            helperText={errors.fullName}
            fullWidth
          />
          <TextField
            label={t('Email')}
            value={values.email}
            onChange={(event) => updateField('email', event.target.value)}
            error={Boolean(errors.email)}
            helperText={errors.email}
            fullWidth
          />
          {!user ? (
            <TextField
              label={t('Password')}
              type="password"
              value={values.password}
              onChange={(event) => updateField('password', event.target.value)}
              error={Boolean(errors.password)}
              helperText={errors.password}
              fullWidth
            />
          ) : null}
          <TextField
            select
            label={t('Role')}
            value={values.role}
            onChange={(event) => updateField('role', event.target.value)}
            fullWidth
          >
            {roleOptions.map((role) => (
              <MenuItem key={role.code} value={role.code}>
                {role.name}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={
              <Switch
                checked={values.isActive}
                onChange={(event) => updateField('isActive', event.target.checked)}
              />
            }
            label={t('Active user')}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('Cancel')}</Button>
        <Button onClick={handleSubmit} variant="contained">
          {user ? t('Save user') : t('Create user')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function UsersPanel({ users, roles, onCreate, onEdit }) {
  const { t } = useLanguage();
  const roleNameByCode = useMemo(
    () => Object.fromEntries(roles.map((role) => [role.code, role.name])),
    [roles],
  );

  return (
    <Stack spacing={2}>
      <Box className="crm-users-management__panel-header">
        <Box>
          <Typography variant="h6">{t('Users')}</Typography>
          <Typography className="crm-muted-text">
            {t('Create users and assign the fixed CRM role they operate under.')}
          </Typography>
        </Box>
        <Button variant="contained" onClick={onCreate}>
          {t('Add user')}
        </Button>
      </Box>

      <Box className="crm-users-management__list">
        {users.map((user) => (
          <Card key={user.id} className="crm-users-management__card">
            <CardContent className="crm-users-management__user-card">
              <Box>
                <Typography variant="h6">{user.fullName}</Typography>
                <Typography className="crm-muted-text">{user.email}</Typography>
              </Box>
              <Chip label={roleNameByCode[user.role] || user.role} variant="outlined" />
              <Chip
                color={user.isActive ? 'success' : 'default'}
                label={user.isActive ? t('Active') : t('Inactive')}
                size="small"
              />
              <Button variant="outlined" onClick={() => onEdit(user)}>
                {t('Edit')}
              </Button>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Stack>
  );
}

function RolesPanel({ roles, permissions, onSave }) {
  const { t } = useLanguage();
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    setDrafts(Object.fromEntries(roles.map((role) => [role.code, role.permissions || []])));
  }, [roles]);

  const permissionsByGroup = useMemo(() => {
    return permissions.reduce((groups, permission) => {
      const group = permission.group || 'Other';
      groups[group] = groups[group] || [];
      groups[group].push(permission);
      return groups;
    }, {});
  }, [permissions]);

  function togglePermission(roleCode, permissionCode, checked) {
    setDrafts((current) => {
      const existing = new Set(current[roleCode] || []);

      if (checked) {
        existing.add(permissionCode);
      } else {
        existing.delete(permissionCode);
      }

      return {
        ...current,
        [roleCode]: Array.from(existing),
      };
    });
  }

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h6">{t('Roles & Permissions')}</Typography>
        <Typography className="crm-muted-text">
          {t('Adjust what each fixed CRM role can do. Super Admin always keeps full access.')}
        </Typography>
      </Box>

      <Box className="crm-users-management__roles">
        {roles.map((role) => {
          const selectedPermissions = new Set(drafts[role.code] || []);
          const hasChanged =
            JSON.stringify([...(role.permissions || [])].sort()) !==
            JSON.stringify([...(drafts[role.code] || [])].sort());

          return (
            <Card key={role.code} className="crm-users-management__card">
              <CardContent>
                <Box className="crm-users-management__role-header">
                  <Box>
                    <Typography variant="h6">{role.name}</Typography>
                    <Typography className="crm-muted-text">
                      {role.isEditable ? t('Editable permission set') : t('Protected system role')}
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    disabled={!role.isEditable || !hasChanged}
                    onClick={() => onSave(role.code, drafts[role.code] || [])}
                  >
                    {t('Save permissions')}
                  </Button>
                </Box>

                <Box className="crm-users-management__permission-groups">
                  {Object.entries(permissionsByGroup).map(([group, groupPermissions]) => (
                    <Box key={`${role.code}-${group}`} className="crm-users-management__permission-group">
                      <Typography variant="subtitle2">{t(group)}</Typography>
                      <Box className="crm-users-management__permissions">
                        {groupPermissions.map((permission) => (
                          <FormControlLabel
                            key={`${role.code}-${permission.code}`}
                            control={
                              <Checkbox
                                checked={selectedPermissions.has(permission.code)}
                                disabled={!role.isEditable}
                                onChange={(event) =>
                                  togglePermission(role.code, permission.code, event.target.checked)
                                }
                              />
                            }
                            label={t(permission.label)}
                          />
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Stack>
  );
}

function UsersManagementPage() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { showNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const usersQuery = useQuery({
    queryKey: ['users-management', 'users'],
    queryFn: getUsers,
  });
  const rolesQuery = useQuery({
    queryKey: ['users-management', 'roles'],
    queryFn: getRoles,
  });
  const permissionsQuery = useQuery({
    queryKey: ['users-management', 'permissions'],
    queryFn: getPermissions,
  });

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-management', 'users'] });
      setFormOpen(false);
      showNotification({ severity: 'success', message: t('User created successfully.') });
    },
    onError: (error) => {
      showNotification({ severity: 'error', message: normalizeApiError(error).message });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, payload }) => updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-management', 'users'] });
      setFormOpen(false);
      setEditingUser(null);
      showNotification({ severity: 'success', message: t('User updated successfully.') });
    },
    onError: (error) => {
      showNotification({ severity: 'error', message: normalizeApiError(error).message });
    },
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: ({ roleCode, permissions }) => updateRolePermissions(roleCode, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-management', 'roles'] });
      showNotification({ severity: 'success', message: t('Permissions updated successfully.') });
    },
    onError: (error) => {
      showNotification({ severity: 'error', message: normalizeApiError(error).message });
    },
  });

  if (
    (usersQuery.isLoading && !usersQuery.data) ||
    (rolesQuery.isLoading && !rolesQuery.data) ||
    (permissionsQuery.isLoading && !permissionsQuery.data)
  ) {
    return <LoadingState />;
  }

  if (usersQuery.isError || rolesQuery.isError || permissionsQuery.isError) {
    const error = usersQuery.error || rolesQuery.error || permissionsQuery.error;
    return (
      <ErrorState
        title={t('Unable to load users management.')}
        description={normalizeApiError(error).message}
        onRetry={() => {
          usersQuery.refetch();
          rolesQuery.refetch();
          permissionsQuery.refetch();
        }}
      />
    );
  }

  const users = usersQuery.data || [];
  const roles = rolesQuery.data || [];
  const permissions = permissionsQuery.data || [];

  function handleSubmitUser(payload) {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, payload });
      return;
    }

    createUserMutation.mutate(payload);
  }

  return (
    <Stack spacing={3} className="crm-users-management-page">
      <PageHeader
        eyebrow={t('Administration')}
        title={t('Users Management')}
        description={t('Manage CRM users, fixed roles, and the permissions available to each role.')}
      />

      <Card className="crm-card crm-users-management__shell">
        <CardContent>
          <Tabs value={activeTab} onChange={(event, value) => setActiveTab(value)}>
            <Tab label={t('Users')} />
            <Tab label={t('Roles & Permissions')} />
          </Tabs>
          <Box className="crm-users-management__tab-panel">
            {activeTab === 0 ? (
              <UsersPanel
                users={users}
                roles={roles}
                onCreate={() => {
                  setEditingUser(null);
                  setFormOpen(true);
                }}
                onEdit={(user) => {
                  setEditingUser(user);
                  setFormOpen(true);
                }}
              />
            ) : (
              <RolesPanel
                roles={roles}
                permissions={permissions}
                onSave={(roleCode, nextPermissions) =>
                  updatePermissionsMutation.mutate({
                    roleCode,
                    permissions: nextPermissions,
                  })
                }
              />
            )}
          </Box>
        </CardContent>
      </Card>

      <UserFormDialog
        open={formOpen}
        user={editingUser}
        roleOptions={roles}
        onClose={() => {
          setFormOpen(false);
          setEditingUser(null);
        }}
        onSubmit={handleSubmitUser}
      />
    </Stack>
  );
}

export default UsersManagementPage;
