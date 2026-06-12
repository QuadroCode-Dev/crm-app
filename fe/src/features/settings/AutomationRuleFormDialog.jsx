import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { yupResolver } from '@hookform/resolvers/yup';
import { Controller, useForm } from 'react-hook-form';
import { useEffect } from 'react';
import * as yup from 'yup';

const automationRuleSchema = yup.object({
  name: yup.string().trim().required('Rule name is required.'),
  targetStageId: yup.string().required('Target stage is required.'),
  isActive: yup.boolean().required(),
  taskTitleTemplate: yup.string().trim().required('Task title template is required.'),
  taskDescriptionTemplate: yup.string().trim().required('Task description template is required.'),
  taskDueOffsetDays: yup
    .number()
    .typeError('Due offset is required.')
    .integer('Due offset must be a whole number.')
    .min(0, 'Due offset must be 0 or greater.')
    .required('Due offset is required.'),
  assignToOwner: yup.boolean().required(),
});

function AutomationRuleFormDialog({ open, rule, stageOptions, onClose, onSubmit }) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      targetStageId: '',
      isActive: true,
      taskTitleTemplate: '',
      taskDescriptionTemplate: '',
      taskDueOffsetDays: 0,
      assignToOwner: true,
    },
    resolver: yupResolver(automationRuleSchema),
  });

  useEffect(() => {
    reset({
      name: rule?.name || '',
      targetStageId: rule?.targetStageId || '',
      isActive: rule?.isActive ?? true,
      taskTitleTemplate: rule?.taskTitleTemplate || '',
      taskDescriptionTemplate: rule?.taskDescriptionTemplate || '',
      taskDueOffsetDays: rule?.taskDueOffsetDays ?? 0,
      assignToOwner: rule?.assignToOwner ?? true,
    });
  }, [open, reset, rule]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{rule ? 'Edit automation rule' : 'Create automation rule'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField label="Trigger type" value="StageChanged" fullWidth disabled />
            <TextField label="Action type" value="CreateTask" fullWidth disabled />
          </Stack>

          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Rule name"
                error={Boolean(errors.name)}
                helperText={errors.name?.message}
              />
            )}
          />

          <Controller
            name="targetStageId"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Target stage"
                error={Boolean(errors.targetStageId)}
                helperText={errors.targetStageId?.message}
              >
                {stageOptions.map((stage) => (
                  <MenuItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Controller
            name="taskTitleTemplate"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Task title template"
                error={Boolean(errors.taskTitleTemplate)}
                helperText={errors.taskTitleTemplate?.message}
              />
            )}
          />

          <Controller
            name="taskDescriptionTemplate"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Task description template"
                multiline
                minRows={3}
                error={Boolean(errors.taskDescriptionTemplate)}
                helperText={errors.taskDescriptionTemplate?.message}
              />
            )}
          />

          <Controller
            name="taskDueOffsetDays"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Task due offset days"
                error={Boolean(errors.taskDueOffsetDays)}
                helperText={errors.taskDueOffsetDays?.message}
              />
            )}
          />

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
          >
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                    />
                  }
                  label="Rule is active"
                />
              )}
            />

            <Controller
              name="assignToOwner"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                    />
                  }
                  label="Assign generated task to lead owner"
                />
              )}
            />
          </Stack>

          <Stack spacing={0.75}>
            <Typography variant="subtitle2">Supported placeholders</Typography>
            <Typography className="crm-muted-text">
              {'{leadTitle}'} {'{contactName}'} {'{stageName}'} {'{serviceRequested}'}
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting} variant="contained">
          {rule ? 'Save rule' : 'Create rule'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AutomationRuleFormDialog;
