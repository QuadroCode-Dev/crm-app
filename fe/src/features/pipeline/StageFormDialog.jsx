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
    isActive: yup.boolean().required(),
  });
}

function StageFormDialog({ open, stage, onClose, onSubmit }) {
  const { t } = useLanguage();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      isActive: true,
    },
    resolver: yupResolver(createStageSchema(t)),
  });

  useEffect(() => {
    reset({
      name: stage?.name || '',
      isActive: stage?.isActive ?? true,
    });
  }, [stage, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
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
        <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting} variant="contained">
          {isSubmitting ? t('Saving...') : stage ? t('Save stage') : t('Create stage')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default StageFormDialog;
