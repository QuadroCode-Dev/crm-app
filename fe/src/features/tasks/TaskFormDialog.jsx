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

const taskSchema = yup.object({
  title: yup.string().trim().required('Task title is required.'),
  leadId: yup.string().nullable(),
  contactId: yup.string().nullable(),
  assignedUserId: yup.string().required('Assigned user is required.'),
  priority: yup.string().required('Priority is required.'),
  status: yup.string().required('Status is required.'),
  dueDateUtc: yup.string().required('Due date is required.'),
});

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
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(taskSchema),
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
      <DialogTitle>{task?.id ? 'Edit task' : 'Create task'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ paddingTop: 1 }}>
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Title"
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
                label="Lead"
                error={Boolean(errors.leadId)}
                helperText={errors.leadId?.message}
              >
                <MenuItem value="">No lead</MenuItem>
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
                label="Contact"
                error={Boolean(errors.contactId)}
                helperText={errors.contactId?.message}
              >
                <MenuItem value="">No contact</MenuItem>
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
                label="Assigned user"
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
                  label="Priority"
                  error={Boolean(errors.priority)}
                  helperText={errors.priority?.message}
                  fullWidth
                >
                  {priorityOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
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
                  label="Status"
                  error={Boolean(errors.status)}
                  helperText={errors.status?.message}
                  fullWidth
                >
                  {statusOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
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
                label="Due date"
                InputLabelProps={{ shrink: true }}
                error={Boolean(errors.dueDateUtc)}
                helperText={errors.dueDateUtc?.message}
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit(onSubmit)} variant="contained" disabled={isSubmitting}>
          {task?.id ? 'Save task' : 'Create task'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TaskFormDialog;
