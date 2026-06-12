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

const leadSchema = yup.object({
  title: yup.string().trim().required('Title is required.'),
  contactId: yup.string().required('Contact is required.'),
  source: yup.string().trim().required('Source is required.'),
  stageId: yup.string().required('Pipeline stage is required.'),
  ownerUserId: yup.string().required('Owner is required.'),
  status: yup.string().trim().required('Status is required.'),
  estimatedCost: yup
    .number()
    .transform((value, originalValue) => (originalValue === '' ? null : value))
    .nullable()
    .typeError('Estimated cost must be a number.'),
  serviceRequested: yup.string().trim().nullable(),
  message: yup.string().trim().nullable(),
});

function LeadFormDialog({
  contacts,
  lead,
  open,
  ownerOptions,
  sourceOptions,
  stageOptions,
  statusOptions,
  onClose,
  onSubmit,
}) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      title: '',
      contactId: '',
      source: '',
      stageId: '',
      ownerUserId: '',
      status: '',
      estimatedCost: '',
      serviceRequested: '',
      message: '',
    },
    resolver: yupResolver(leadSchema),
  });

  useEffect(() => {
    reset({
      title: lead?.title || '',
      contactId: lead?.contactId || '',
      source: lead?.sourceId || lead?.leadSourceId || lead?.source || '',
      stageId: lead?.stageId || '',
      ownerUserId: lead?.ownerUserId || '',
      status: lead?.status || '',
      estimatedCost: lead?.estimatedCost ?? '',
      serviceRequested: lead?.serviceRequested || '',
      message: lead?.message || '',
    });
  }, [lead, reset]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{lead ? 'Edit lead' : 'Create lead'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
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
            name="contactId"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                SelectProps={{ native: true }}
                InputLabelProps={{ shrink: true }}
                label="Contact"
                error={Boolean(errors.contactId)}
                helperText={errors.contactId?.message}
              >
                <option value="">Select a contact</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.fullName}
                  </option>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="source"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                SelectProps={{ native: true }}
                InputLabelProps={{ shrink: true }}
                label="Source"
                error={Boolean(errors.source)}
                helperText={errors.source?.message}
              >
                <option value="">Select a source</option>
                {sourceOptions.map((option) => (
                  <option key={option.id || option} value={option.id || option}>
                    {option.name || option}
                  </option>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="stageId"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                SelectProps={{ native: true }}
                InputLabelProps={{ shrink: true }}
                label="Pipeline stage"
                error={Boolean(errors.stageId)}
                helperText={errors.stageId?.message}
              >
                <option value="">Select a stage</option>
                {stageOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="ownerUserId"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                SelectProps={{ native: true }}
                InputLabelProps={{ shrink: true }}
                label="Owner"
                error={Boolean(errors.ownerUserId)}
                helperText={errors.ownerUserId?.message}
              >
                <option value="">Select an owner</option>
                {ownerOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.fullName}
                  </option>
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
                SelectProps={{ native: true }}
                InputLabelProps={{ shrink: true }}
                label="Status"
                error={Boolean(errors.status)}
                helperText={errors.status?.message}
              >
                <option value="">Select a status</option>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="estimatedCost"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Estimated cost"
                error={Boolean(errors.estimatedCost)}
                helperText={errors.estimatedCost?.message}
              />
            )}
          />
          <Controller
            name="serviceRequested"
            control={control}
            render={({ field }) => <TextField {...field} label="Service requested" />}
          />
          <Controller
            name="message"
            control={control}
            render={({ field }) => <TextField {...field} label="Message" multiline minRows={3} />}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit(onSubmit)} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : lead ? 'Save lead' : 'Create lead'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default LeadFormDialog;
