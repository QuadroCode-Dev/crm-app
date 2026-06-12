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

const noteSchema = yup.object({
  content: yup.string().trim().required('Note content is required.'),
});

function NoteFormDialog({ open, note, onClose, onSubmit }) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      content: '',
    },
    resolver: yupResolver(noteSchema),
  });

  useEffect(() => {
    reset({
      content: note?.content || '',
    });
  }, [note, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{note ? 'Edit note' : 'Add note'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Controller
            name="content"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Note"
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
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit(onSubmit)} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : note ? 'Save note' : 'Create note'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default NoteFormDialog;
