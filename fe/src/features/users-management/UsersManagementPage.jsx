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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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

function getPermissionActionLabel(permission) {
  const label = permission.label || permission.code;

  const exactLabels = {
    'Manage users': 'Users',
    'Manage roles and permissions': 'Roles',
    'Change lead stage': 'Change stage',
    'Manage settings': 'General',
    'Manage pipeline stages': 'Pipeline stages',
    'Manage services': 'Services',
    'Manage automation': 'Automation',
    'Manage integrations': 'Integrations',
  };

  if (exactLabels[label]) {
    return exactLabels[label];
  }

  const action = label.match(/^(Create|Edit|Delete|Assign|Complete|View|Manage)\b/i)?.[1];

  return action || label;
}

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

  const permissionGroups = useMemo(() => {
    const groups = [];
    const groupByName = new Map();

    permissions.forEach((permission) => {
      const groupName = permission.group || 'Other';

      if (!groupByName.has(groupName)) {
        const group = {
          name: groupName,
          permissions: [],
        };
        groupByName.set(groupName, group);
        groups.push(group);
      }

      groupByName.get(groupName).permissions.push(permission);
    });

    return groups;
  }, [permissions]);

  const permissionColumns = useMemo(
    () =>
      permissionGroups.flatMap((group, groupIndex) =>
        group.permissions.map((permission, permissionIndex) => ({
          ...permission,
          groupIndex,
          isFirstInGroup: permissionIndex === 0,
          isLastInGroup: permissionIndex === group.permissions.length - 1,
        })),
      ),
    [permissionGroups],
  );

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
          {t('Compare each fixed CRM role and adjust editable permission sets. Super Admin always keeps full access.')}
        </Typography>
      </Box>

      <TableContainer className="crm-users-management__permissions-table-wrap">
        <Table stickyHeader className="crm-users-management__permissions-table">
          <TableHead>
            <TableRow>
              <TableCell rowSpan={2} className="crm-users-management__role-cell crm-users-management__sticky-column">
                {t('Role')}
              </TableCell>
              {permissionGroups.map((group, groupIndex) => (
                <TableCell
                  key={group.name}
                  align="center"
                  colSpan={group.permissions.length}
                  className={`crm-users-management__permission-group-cell crm-users-management__permission-cell--group-${groupIndex % 2}`}
                >
                  {t(group.name)}
                </TableCell>
              ))}
              <TableCell rowSpan={2} align="right" className="crm-users-management__actions-cell">
                {t('Actions')}
              </TableCell>
            </TableRow>
            <TableRow>
              {permissionColumns.map((permission) => (
                <TableCell
                  key={permission.code}
                  align="center"
                  className={`crm-users-management__permission-cell crm-users-management__permission-cell--group-${permission.groupIndex % 2} ${permission.isFirstInGroup ? 'crm-users-management__permission-cell--group-start' : ''} ${permission.isLastInGroup ? 'crm-users-management__permission-cell--group-end' : ''}`}
                >
                  <Typography variant="body2" className="crm-users-management__permission-label">
                    {t(getPermissionActionLabel(permission))}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {roles.map((role) => {
              const selectedPermissions = new Set(drafts[role.code] || []);
              const hasChanged =
                JSON.stringify([...(role.permissions || [])].sort()) !==
                JSON.stringify([...(drafts[role.code] || [])].sort());

              return (
                <TableRow key={role.code} hover>
                  <TableCell className="crm-users-management__role-cell crm-users-management__sticky-column">
                    <Typography variant="subtitle2">{role.name}</Typography>
                    <Typography className="crm-muted-text">
                      {role.isEditable ? t('Editable') : t('Protected')}
                    </Typography>
                  </TableCell>
                  {permissionColumns.map((permission) => (
                    <TableCell
                      key={`${role.code}-${permission.code}`}
                      align="center"
                      className={`crm-users-management__permission-check-cell crm-users-management__permission-cell--group-${permission.groupIndex % 2} ${permission.isFirstInGroup ? 'crm-users-management__permission-cell--group-start' : ''} ${permission.isLastInGroup ? 'crm-users-management__permission-cell--group-end' : ''}`}
                    >
                      <Checkbox
                        checked={selectedPermissions.has(permission.code)}
                        disabled={!role.isEditable}
                        inputProps={{
                          'aria-label': t(`${role.name} - ${permission.label}`),
                        }}
                        onChange={(event) =>
                          togglePermission(role.code, permission.code, event.target.checked)
                        }
                      />
                    </TableCell>
                  ))}
                  <TableCell align="right" className="crm-users-management__actions-cell">
                    <Button
                      variant="contained"
                      size="small"
                      disabled={!role.isEditable || !hasChanged}
                      onClick={() => onSave(role.code, drafts[role.code] || [])}
                    >
                      {t('Save')}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
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
