import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { yupResolver } from '@hookform/resolvers/yup';
import { Controller, useForm } from 'react-hook-form';
import { useEffect } from 'react';
import * as yup from 'yup';
import useLanguage from '../../shared/hooks/useLanguage.js';

function createNoteSchema(t) {
  return yup.object({
    content: yup.string().trim().required(t('Note content is required.')),
  });
}

function NoteFormDialog({ open, note, onClose, onSubmit }) {
  const { t } = useLanguage();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      content: '',
    },
    resolver: yupResolver(createNoteSchema(t)),
  });

  useEffect(() => {
    reset({
      content: note?.content || '',
    });
  }, [note, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{note ? t('Edit note') : t('Add note')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Controller
            name="content"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('Note')}
                multiline
                minRows={4}
                error={Boolean(errors.content)}
                helperText={errors.content?.message}
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('Cancel')}</Button>
        <Button onClick={handleSubmit(onSubmit)} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? t('Saving...') : note ? t('Save note') : t('Create note')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default NoteFormDialog;
