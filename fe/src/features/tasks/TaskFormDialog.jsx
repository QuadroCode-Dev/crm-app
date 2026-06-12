import { yupResolver } from '@hookform/resolvers/yup';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';
import useLanguage from '../../shared/hooks/useLanguage.js';

function createTaskSchema(t) {
  return yup.object({
    title: yup.string().trim().required(t('Task title is required.')),
    leadId: yup.string().nullable(),
    contactId: yup.string().nullable(),
    assignedUserId: yup.string().required(t('Assigned user is required.')),
    priority: yup.string().required(t('Priority is required.')),
    status: yup.string().required(t('Status is required.')),
    dueDateUtc: yup.string().required(t('Due date is required.')),
  });
}

function toDateInputValue(value) {
  if (!value) {
    return '';
  }

  return String(value).slice(0, 10);
}

function TaskFormDialog({
  open,
  task,
  onClose,
  onSubmit,
  leadOptions,
  contactOptions,
  assignedUserOptions,
  priorityOptions,
  statusOptions,
}) {
  const { t } = useLanguage();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(createTaskSchema(t)),
    defaultValues: {
      title: task?.title || '',
      leadId: task?.leadId || '',
      contactId: task?.contactId || '',
      assignedUserId: task?.assignedUserId || '',
      priority: task?.priority || 'Medium',
      status: task?.status || 'Pending',
      dueDateUtc: toDateInputValue(task?.dueDateUtc),
    },
  });

  useEffect(() => {
    reset({
      title: task?.title || '',
      leadId: task?.leadId || '',
      contactId: task?.contactId || '',
      assignedUserId: task?.assignedUserId || '',
      priority: task?.priority || 'Medium',
      status: task?.status || 'Pending',
      dueDateUtc: toDateInputValue(task?.dueDateUtc),
    });
  }, [reset, task, open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{task?.id ? t('Edit task') : t('Create task')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ paddingTop: 1 }}>
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('Title')}
                error={Boolean(errors.title)}
                helperText={errors.title?.message}
              />
            )}
          />

          <Controller
            name="leadId"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label={t('Lead')}
                error={Boolean(errors.leadId)}
                helperText={errors.leadId?.message}
              >
                <MenuItem value="">{t('No lead')}</MenuItem>
                {leadOptions.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.title}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Controller
            name="contactId"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label={t('Contact')}
                error={Boolean(errors.contactId)}
                helperText={errors.contactId?.message}
              >
                <MenuItem value="">{t('No contact')}</MenuItem>
                {contactOptions.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.fullName}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Controller
            name="assignedUserId"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label={t('Assigned user')}
                error={Boolean(errors.assignedUserId)}
                helperText={errors.assignedUserId?.message}
              >
                {assignedUserOptions.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.fullName}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label={t('Priority')}
                  error={Boolean(errors.priority)}
                  helperText={errors.priority?.message}
                  fullWidth
                >
                  {priorityOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {t(option)}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label={t('Status')}
                  error={Boolean(errors.status)}
                  helperText={errors.status?.message}
                  fullWidth
                >
                  {statusOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {t(option)}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Stack>

          <Controller
            name="dueDateUtc"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="date"
                label={t('Due date')}
                InputLabelProps={{ shrink: true }}
                error={Boolean(errors.dueDateUtc)}
                helperText={errors.dueDateUtc?.message}
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('Cancel')}</Button>
        <Button onClick={handleSubmit(onSubmit)} variant="contained" disabled={isSubmitting}>
          {task?.id ? t('Save task') : t('Create task')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TaskFormDialog;
