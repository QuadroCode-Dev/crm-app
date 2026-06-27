import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import { yupResolver } from '@hookform/resolvers/yup';
import { Controller, useForm } from 'react-hook-form';
import { useEffect } from 'react';
import * as yup from 'yup';
import useLanguage from '../../shared/hooks/useLanguage.js';

function createStageSchema(t) {
  return yup.object({
    name: yup.string().trim().required(t('Stage name is required.')),
    order: yup
      .number()
      .transform((value, originalValue) => (originalValue === '' ? null : value))
      .typeError(t('Sort order must be a number.'))
      .min(1, t('Sort order must be greater than zero.'))
      .required(t('Sort order is required.')),
    color: yup.string().trim().nullable(),
    rottingThresholdDays: yup
      .number()
      .transform((value, originalValue) => (originalValue === '' ? 0 : value))
      .typeError(t('Rotting threshold days must be a number.'))
      .min(0, t('Rotting threshold cannot be negative.')),
    rottingThresholdHoursPart: yup
      .number()
      .transform((value, originalValue) => (originalValue === '' ? 0 : value))
      .typeError(t('Rotting threshold hours must be a number.'))
      .min(0, t('Rotting threshold cannot be negative.'))
      .max(23, t('Hours must be less than 24.'))
      .test(
        'rotting-threshold-positive',
        t('Rotting threshold must be greater than zero.'),
        function validateThreshold(value) {
          return Number(this.parent.rottingThresholdDays || 0) > 0 || Number(value || 0) > 0;
        },
      ),
    isDefault: yup.boolean().required(),
    isWonStage: yup.boolean().required(),
    isLostStage: yup.boolean().required(),
    isActive: yup.boolean().required(),
  });
}

function StageFormDialog({ nextSortOrder = 1, open, stage, onClose, onSubmit }) {
  const { t } = useLanguage();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      order: nextSortOrder,
      color: '#64748B',
      rottingThresholdDays: 7,
      rottingThresholdHoursPart: 0,
      isDefault: false,
      isWonStage: false,
      isLostStage: false,
      isActive: true,
    },
    resolver: yupResolver(createStageSchema(t)),
  });

  useEffect(() => {
    const thresholdHours = stage?.rottingThresholdHours ?? 168;

    reset({
      name: stage?.name || '',
      order: stage?.order || stage?.sortOrder || nextSortOrder,
      color: stage?.color || '#64748B',
      rottingThresholdDays: Math.floor(thresholdHours / 24),
      rottingThresholdHoursPart: thresholdHours % 24,
      isDefault: stage?.isDefault ?? false,
      isWonStage: stage?.isWonStage ?? false,
      isLostStage: stage?.isLostStage ?? false,
      isActive: stage?.isActive ?? true,
    });
  }, [nextSortOrder, stage, reset]);

  function handleStageSubmit(values) {
    const rottingThresholdHours =
      Number(values.rottingThresholdDays || 0) * 24 +
      Number(values.rottingThresholdHoursPart || 0);

    return onSubmit({
      name: values.name,
      order: Number(values.order),
      sortOrder: Number(values.order),
      color: values.color || null,
      rottingThresholdHours,
      isDefault: values.isDefault,
      isWonStage: values.isWonStage,
      isLostStage: values.isLostStage,
      isActive: values.isActive,
    });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{stage ? t('Edit stage') : t('Create stage')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('Stage name')}
                error={Boolean(errors.name)}
                helperText={errors.name?.message}
              />
            )}
          />
          <Controller
            name="order"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('Sort order')}
                type="number"
                inputProps={{ min: 1, step: 1 }}
                error={Boolean(errors.order)}
                helperText={errors.order?.message}
              />
            )}
          />
          <Controller
            name="color"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('Stage color')}
                type="color"
                error={Boolean(errors.color)}
                helperText={errors.color?.message}
              />
            )}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Controller
              name="rottingThresholdDays"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label={t('Rotting threshold days')}
                  type="number"
                  inputProps={{ min: 0, step: 1 }}
                  error={Boolean(errors.rottingThresholdDays)}
                  helperText={errors.rottingThresholdDays?.message}
                />
              )}
            />
            <Controller
              name="rottingThresholdHoursPart"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label={t('Hours')}
                  type="number"
                  inputProps={{ min: 0, max: 23, step: 1 }}
                  error={Boolean(errors.rottingThresholdHoursPart)}
                  helperText={errors.rottingThresholdHoursPart?.message}
                />
              )}
            />
          </Stack>
          <Controller
            name="isDefault"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                  />
                }
                label={t('Default stage')}
              />
            )}
          />
          <Controller
            name="isWonStage"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                  />
                }
                label={t('Won stage')}
              />
            )}
          />
          <Controller
            name="isLostStage"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                  />
                }
                label={t('Lost stage')}
              />
            )}
          />
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
                label={t('Active stage')}
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('Cancel')}</Button>
        <Button onClick={handleSubmit(handleStageSubmit)} disabled={isSubmitting} variant="contained">
          {isSubmitting ? t('Saving...') : stage ? t('Save stage') : t('Create stage')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default StageFormDialog;
