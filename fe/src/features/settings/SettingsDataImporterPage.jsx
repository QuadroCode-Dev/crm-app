import {
  Alert,
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
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { createContact, getContacts } from '../../api/contactsApi.js';
import { createLead, getLeads } from '../../api/leadsApi.js';
import { getLeadSources } from '../../api/leadSourcesApi.js';
import { normalizeApiError } from '../../api/normalizeApiError.js';
import { getPipelineStages } from '../../api/pipelineApi.js';
import { getServices } from '../../api/servicesApi.js';
import { getActiveUsers } from '../../api/usersApi.js';
import PageHeader from '../../shared/components/PageHeader.jsx';
import ErrorState from '../../shared/components/feedback/ErrorState.jsx';
import LoadingState from '../../shared/components/feedback/LoadingState.jsx';
import useAuth from '../../shared/hooks/useAuth.js';
import useLanguage from '../../shared/hooks/useLanguage.js';
import useNotifications from '../../shared/hooks/useNotifications.js';
import {
  contactImportFields,
  buildExistingImportDuplicateKeys,
  createImportPayload,
  getImportDuplicateKeys,
  inferImportMapping,
  importTargets,
  leadImportFields,
  parseImportFile,
  validateImportRows,
} from './dataImporter.js';
import './dataImporter.css';

const acceptedFileTypes = '.csv,.xls,.xlsx';
const duplicateLookupPageSize = 100;
const statusOptions = ['Open', 'Won', 'Lost', 'Archived'];

function getDefaultLeadValues(sourceOptions, stageOptions, ownerOptions, serviceOptions) {
  return {
    sourceId: sourceOptions[0]?.id || '',
    stageId: stageOptions[0]?.id || '',
    ownerUserId: ownerOptions[0]?.id || '',
    serviceRequested: serviceOptions[0]?.name || '',
    estimatedCost: '',
    status: 'Open',
  };
}

function getFieldTone(type) {
  if (type === 'email') {
    return 'info';
  }

  if (type === 'number') {
    return 'warning';
  }

  if (type === 'lookup') {
    return 'secondary';
  }

  return 'default';
}

function SourceColumnCard({
  header,
  mappedField,
  previewValues,
  onDropField,
  onClear,
  t,
}) {
  return (
    <Card
      className="crm-data-importer-source-card"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const fieldKey = event.dataTransfer.getData('text/plain');

        if (fieldKey) {
          onDropField(header, fieldKey);
        }
      }}
      variant="outlined"
    >
      <CardContent>
        <Box className="crm-data-importer-source-card__header">
          <Box>
            <Typography variant="subtitle2">{header}</Typography>
            <Typography className="crm-muted-text">
              {t('File column')}
            </Typography>
          </Box>
          {mappedField ? (
            <Button size="small" onClick={() => onClear(header)}>
              {t('Clear')}
            </Button>
          ) : null}
        </Box>
        <Box className="crm-data-importer-source-card__mapping">
          {mappedField ? (
            <Box className="crm-data-importer-source-card__mapped-field">
              <span>{t('Mapped to')}</span>
              <Chip
                color={getFieldTone(mappedField.type)}
                label={t(mappedField.label)}
                size="small"
              />
            </Box>
          ) : (
            <span>{t('Drag a CRM field here')}</span>
          )}
        </Box>
        <Stack spacing={0.75} className="crm-data-importer-source-card__preview">
          {previewValues.map((value, index) => (
            <span key={`${header}-${index}`}>{value || '-'}</span>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

function FieldCard({ field, mapped, t }) {
  return (
    <button
      className="crm-data-importer-field-card"
      draggable={!mapped}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', field.key);
      }}
      type="button"
    >
      <span className="crm-data-importer-field-card__handle" aria-hidden="true">::</span>
      <span className="crm-data-importer-field-card__body">
        <strong>{t(field.label)}</strong>
        <small>{t('Drag to a file column')}</small>
      </span>
      {field.required ? <Chip color="warning" label={t('Required')} size="small" /> : null}
      {mapped ? <Chip color="success" label={t('Mapped')} size="small" /> : null}
    </button>
  );
}

async function fetchAllImportDuplicateRecords(target) {
  const fetchPage = target === importTargets.contacts ? getContacts : getLeads;
  const records = [];
  let page = 1;
  let total = null;

  while (total === null || records.length < total) {
    const response = await fetchPage({ page, pageSize: duplicateLookupPageSize });
    const items = response.items || [];

    records.push(...items);
    total = response.totalCount ?? response.total ?? records.length;

    if (items.length === 0 || items.length < duplicateLookupPageSize) {
      break;
    }

    page += 1;
  }

  return records;
}

function SettingsDataImporterPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showNotification } = useNotifications();
  const permissions = new Set(user?.permissions || []);
  const canImportContacts = permissions.has('contacts.create');
  const canImportLeads = permissions.has('leads.create');
  const [target, setTarget] = useState(importTargets.contacts);
  const [fileState, setFileState] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [firstRowHasHeaders, setFirstRowHasHeaders] = useState(true);
  const [selectedHeaders, setSelectedHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [fileError, setFileError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const sourceOptionsQuery = useQuery({
    queryKey: ['lead-sources'],
    queryFn: getLeadSources,
    enabled: target === importTargets.leads,
  });
  const stageOptionsQuery = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: getPipelineStages,
    enabled: target === importTargets.leads,
  });
  const ownerOptionsQuery = useQuery({
    queryKey: ['users', 'active'],
    queryFn: getActiveUsers,
    enabled: target === importTargets.leads,
  });
  const serviceOptionsQuery = useQuery({
    queryKey: ['services'],
    queryFn: getServices,
    enabled: target === importTargets.leads,
  });

  const sourceOptions = sourceOptionsQuery.data || [];
  const stageOptions = stageOptionsQuery.data || [];
  const ownerOptions = ownerOptionsQuery.data || [];
  const serviceOptions = serviceOptionsQuery.data || [];
  const leadDefaults = useMemo(
    () => getDefaultLeadValues(sourceOptions, stageOptions, ownerOptions, serviceOptions),
    [ownerOptions, serviceOptions, sourceOptions, stageOptions],
  );
  const [defaults, setDefaults] = useState(leadDefaults);
  const effectiveDefaults = useMemo(
    () => ({
      sourceId: defaults.sourceId || leadDefaults.sourceId,
      stageId: defaults.stageId || leadDefaults.stageId,
      ownerUserId: defaults.ownerUserId || leadDefaults.ownerUserId,
      serviceRequested: defaults.serviceRequested || leadDefaults.serviceRequested,
      estimatedCost: defaults.estimatedCost || leadDefaults.estimatedCost,
      status: defaults.status || leadDefaults.status,
    }),
    [defaults, leadDefaults],
  );

  const fields = target === importTargets.leads ? leadImportFields : contactImportFields;
  const activeMapping = useMemo(
    () =>
      Object.fromEntries(
        selectedHeaders
          .map((header) => [header, mapping[header]])
          .filter(([, fieldKey]) => Boolean(fieldKey)),
      ),
    [mapping, selectedHeaders],
  );
  const mappedKeys = new Set(Object.values(activeMapping).filter(Boolean));
  const mappedFieldsByHeader = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(activeMapping)
          .map(([header, fieldKey]) => [header, fields.find((field) => field.key === fieldKey)])
          .filter(([, field]) => Boolean(field)),
      ),
    [activeMapping, fields],
  );
  const validation = useMemo(() => {
    if (!fileState) {
      return null;
    }

    return validateImportRows({
      target,
      headers: selectedHeaders,
      mapping: activeMapping,
      rows: fileState.rows,
      defaults: effectiveDefaults,
      sourceOptions,
      stageOptions,
      ownerOptions,
    });
  }, [
    activeMapping,
    effectiveDefaults,
    fileState,
    ownerOptions,
    selectedHeaders,
    sourceOptions,
    stageOptions,
    target,
  ]);
  const importAllowed =
    target === importTargets.contacts ? canImportContacts : canImportLeads;
  const missingLeadDefaults = target === importTargets.leads
    ? [
        ['Source', effectiveDefaults.sourceId],
        ['Pipeline stage', effectiveDefaults.stageId],
        ['Assigned user', effectiveDefaults.ownerUserId],
        ['Service requested', effectiveDefaults.serviceRequested],
      ].filter(([, defaultValue]) => !defaultValue)
    : [];
  const isLeadOptionsLoading =
    target === importTargets.leads &&
    (sourceOptionsQuery.isLoading ||
      stageOptionsQuery.isLoading ||
      ownerOptionsQuery.isLoading ||
      serviceOptionsQuery.isLoading);
  const firstLeadOptionsError =
    sourceOptionsQuery.error ||
    stageOptionsQuery.error ||
    ownerOptionsQuery.error ||
    serviceOptionsQuery.error;

  function resetImportState(nextTarget = target) {
    setFileState(null);
    setSelectedFile(null);
    setSelectedHeaders([]);
    setMapping({});
    setFileError('');
    setImportResult(null);
    setSummaryOpen(false);
    setDefaults(getDefaultLeadValues(sourceOptions, stageOptions, ownerOptions, serviceOptions));
    setTarget(nextTarget);
  }

  async function parseSelectedFile(file, nextFirstRowHasHeaders = firstRowHasHeaders) {
    setFileError('');
    setImportResult(null);

    if (!file) {
      return;
    }

    try {
      const parsedFile = await parseImportFile(file, {
        firstRowHasHeaders: nextFirstRowHasHeaders,
      });
      const inferredMapping = inferImportMapping(target, parsedFile.headers);
      const inferredHeaders = parsedFile.headers.filter((header) => inferredMapping[header]);

      setFileState({
        ...parsedFile,
        fileName: file.name,
      });
      setMapping(inferredMapping);
      setSelectedHeaders(inferredHeaders.length ? inferredHeaders : parsedFile.headers.slice(0, 6));
    } catch (error) {
      setFileState(null);
      setFileError(error.message);
      setSelectedHeaders([]);
      setMapping({});
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setSelectedFile(file);

    try {
      await parseSelectedFile(file);
    } finally {
      event.target.value = '';
    }
  }

  function handleFirstRowToggle(event) {
    const checked = event.target.checked;

    setFirstRowHasHeaders(checked);

    if (selectedFile) {
      parseSelectedFile(selectedFile, checked);
    }
  }

  function toggleSelectedHeader(header) {
    setSelectedHeaders((current) => {
      if (current.includes(header)) {
        setMapping((currentMapping) => {
          const nextMapping = { ...currentMapping };
          delete nextMapping[header];
          return nextMapping;
        });
        return current.filter((selectedHeader) => selectedHeader !== header);
      }

      return [...current, header];
    });
  }

  function handleDropField(header, fieldKey) {
    setMapping((current) => {
      const nextMapping = Object.fromEntries(
        Object.entries(current).filter(([, mappedFieldKey]) => mappedFieldKey !== fieldKey),
      );

      nextMapping[header] = fieldKey;
      return nextMapping;
    });
  }

  async function runImport() {
    if (!fileState || !validation?.isValid || !importAllowed) {
      return;
    }

    const successes = [];
    const failures = [];
    const skipped = [];
    const existingRecords = await fetchAllImportDuplicateRecords(target);
    const duplicateKeys = buildExistingImportDuplicateKeys(target, existingRecords);
    const importedKeys = new Set();

    for (const row of fileState.rows) {
      try {
        const payload = createImportPayload({
          target,
          row,
          headers: selectedHeaders,
          mapping: activeMapping,
          defaults: effectiveDefaults,
          sourceOptions,
          stageOptions,
          ownerOptions,
        });
        const rowDuplicateKeys = getImportDuplicateKeys(target, payload);
        const duplicateKey = rowDuplicateKeys.find(
          (key) => duplicateKeys.has(key) || importedKeys.has(key),
        );

        if (duplicateKey) {
          skipped.push({
            reason: duplicateKey.startsWith('email:')
              ? t('Duplicate email already exists.')
              : t('Duplicate phone already exists.'),
            rowNumber: row.__rowNumber,
          });
          continue;
        }

        if (target === importTargets.contacts) {
          const contact = await createContact(payload);
          successes.push(contact);
        } else {
          const lead = await createLead(payload);
          successes.push(lead);
        }

        rowDuplicateKeys.forEach((key) => importedKeys.add(key));
      } catch (error) {
        failures.push({
          rowNumber: row.__rowNumber,
          message: normalizeApiError(error).message,
        });
      }
    }

    await queryClient.invalidateQueries({
      queryKey: [target === importTargets.contacts ? 'contacts' : 'leads'],
    });
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });

    setImportResult({
      failures,
      skipped,
      successes,
    });
    setSummaryOpen(true);
    showNotification({
      message: failures.length
        ? t('Import finished with row errors.')
        : t('Import completed successfully.'),
      severity: failures.length ? 'warning' : 'success',
    });
  }

  const importMutation = useMutation({
    mutationFn: runImport,
  });
  const canSubmitImport =
    validation?.isValid &&
    missingLeadDefaults.length === 0 &&
    importAllowed &&
    !importMutation.isPending;

  if (isLeadOptionsLoading) {
    return <LoadingState />;
  }

  if (firstLeadOptionsError) {
    return (
      <ErrorState
        title={t('Unable to load importer options.')}
        description={normalizeApiError(firstLeadOptionsError).message}
        onRetry={() => {
          sourceOptionsQuery.refetch();
          stageOptionsQuery.refetch();
          ownerOptionsQuery.refetch();
          serviceOptionsQuery.refetch();
        }}
      />
    );
  }

  return (
    <Stack spacing={3} className="crm-data-importer-page">
      <PageHeader
        eyebrow={t('Settings')}
        title={t('Data importer')}
        description={t('Import contacts or leads from CSV, XLS, and XLSX files with guided field mapping.')}
      />

      <Card className="crm-card">
        <CardContent>
          <Box className="crm-data-importer-steps" aria-label={t('Import progress')}>
            {[
              'Choose data',
              'Upload file',
              'Map fields',
              'Validate',
              'Import',
            ].map((step, index) => (
              <span key={step}>
                <strong>{index + 1}</strong>
                {t(step)}
              </span>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Card className="crm-card">
        <CardContent>
          <Box className="crm-data-importer-topbar">
            <TextField
              label={t('Import type')}
              onChange={(event) => resetImportState(event.target.value)}
              select
              size="small"
              value={target}
            >
              <MenuItem value={importTargets.contacts}>{t('Contacts')}</MenuItem>
              <MenuItem value={importTargets.leads}>{t('Leads')}</MenuItem>
            </TextField>
            <Button component="label" variant="contained">
              {t('Upload file')}
              <input
                accept={acceptedFileTypes}
                hidden
                onChange={handleFileChange}
                type="file"
              />
            </Button>
            <FormControlLabel
              control={
                <Checkbox
                  checked={firstRowHasHeaders}
                  onChange={handleFirstRowToggle}
                  size="small"
                />
              }
              label={t('First row contains column titles')}
            />
            {fileState ? (
              <Chip
                label={`${fileState.fileName} - ${fileState.rows.length} ${t('rows')}`}
                variant="outlined"
              />
            ) : null}
          </Box>
          {fileError ? <Alert severity="error">{t(fileError)}</Alert> : null}
          {!importAllowed ? (
            <Alert severity="warning">
              {target === importTargets.contacts
                ? t('You need contact create permission to import contacts.')
                : t('You need lead create permission to import leads.')}
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {target === importTargets.leads ? (
        <Card className="crm-card">
          <CardContent>
            <Typography variant="h6">{t('Lead defaults')}</Typography>
            <Typography className="crm-muted-text">
              {t('Used when source, stage, owner, or service are not mapped from the file.')}
            </Typography>
            <Box className="crm-data-importer-defaults">
              <TextField
                label={t('Source')}
                onChange={(event) => setDefaults((current) => ({ ...current, sourceId: event.target.value }))}
                select
                size="small"
                value={defaults.sourceId || leadDefaults.sourceId}
              >
                {sourceOptions.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label={t('Pipeline stage')}
                onChange={(event) => setDefaults((current) => ({ ...current, stageId: event.target.value }))}
                select
                size="small"
                value={defaults.stageId || leadDefaults.stageId}
              >
                {stageOptions.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label={t('Assigned user')}
                onChange={(event) => setDefaults((current) => ({ ...current, ownerUserId: event.target.value }))}
                select
                size="small"
                value={defaults.ownerUserId || leadDefaults.ownerUserId}
              >
                {ownerOptions.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.fullName || option.email}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label={t('Service requested')}
                onChange={(event) =>
                  setDefaults((current) => ({ ...current, serviceRequested: event.target.value }))
                }
                select
                size="small"
                value={defaults.serviceRequested || leadDefaults.serviceRequested}
              >
                {serviceOptions.map((option) => (
                  <MenuItem key={option.id || option.name} value={option.name}>
                    {option.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label={t('Estimated cost')}
                onChange={(event) =>
                  setDefaults((current) => ({ ...current, estimatedCost: event.target.value }))
                }
                size="small"
                type="number"
                value={defaults.estimatedCost || leadDefaults.estimatedCost}
              />
              <TextField
                label={t('Status')}
                onChange={(event) => setDefaults((current) => ({ ...current, status: event.target.value }))}
                select
                size="small"
                value={defaults.status || 'Open'}
              >
                {statusOptions.map((status) => (
                  <MenuItem key={status} value={status}>
                    {t(status)}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </CardContent>
        </Card>
      ) : null}

      {fileState ? (
        <Box className="crm-data-importer-mapper">
          <Card className="crm-card crm-data-importer-mapper__source">
            <CardContent>
              <Box className="crm-data-importer-section-header">
                <Box>
                  <Typography variant="h6">{t('File data')}</Typography>
                  <Typography className="crm-muted-text">
                    {t('Choose the file columns to import, then drop CRM fields onto the matching cards.')}
                  </Typography>
                </Box>
                <Chip label={fileState.sheetName} size="small" variant="outlined" />
              </Box>
              <Box className="crm-data-importer-column-picker">
                <Typography variant="subtitle2">{t('Columns to import')}</Typography>
                <Box>
                  {fileState.headers.map((header) => {
                    const selected = selectedHeaders.includes(header);

                    return (
                      <Button
                        key={header}
                        onClick={() => toggleSelectedHeader(header)}
                        size="small"
                        variant={selected ? 'contained' : 'outlined'}
                      >
                        {selected ? t('Selected') : t('Add')} - {header}
                      </Button>
                    );
                  })}
                </Box>
              </Box>
              <Box className="crm-data-importer-source-grid">
                {selectedHeaders.map((header) => (
                  <SourceColumnCard
                    key={header}
                    header={header}
                    mappedField={mappedFieldsByHeader[header]}
                    onClear={(sourceHeader) =>
                      setMapping((current) => {
                        const nextMapping = { ...current };
                        delete nextMapping[sourceHeader];
                        return nextMapping;
                      })
                    }
                    onDropField={handleDropField}
                    previewValues={fileState.rows.slice(0, 3).map((row) => row[header])}
                    t={t}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>

          <Card className="crm-card crm-data-importer-mapper__fields">
            <CardContent>
              <Typography variant="h6">{t('CRM fields')}</Typography>
              <Typography className="crm-muted-text">
                {t('Drag and drop on matching field')}
              </Typography>
              <Alert severity="info" className="crm-data-importer-help">
                {target === importTargets.leads
                  ? t('For lead imports, drag Full name onto a selected file column. Source, pipeline stage, assigned user, service, estimated cost, and status come from CRM defaults.')
                  : t('For contact imports, Full name is required. Email and phone are optional but validated when mapped.')}
              </Alert>
              <Box className="crm-data-importer-field-list">
                {fields.map((field) => (
                  <FieldCard
                    key={field.key}
                    field={field}
                    mapped={mappedKeys.has(field.key)}
                    t={t}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>
      ) : null}

      {fileState ? (
        <Card className="crm-card">
          <CardContent>
            <Box className="crm-data-importer-section-header">
              <Box>
                <Typography variant="h6">{t('Validation')}</Typography>
                <Typography className="crm-muted-text">
                  {t('CRM checks required mappings, selected columns, defaults, and basic field types before importing.')}
                </Typography>
              </Box>
              <Chip
                color={validation?.isValid ? 'success' : 'warning'}
                label={validation?.isValid ? t('Ready to import') : t('Needs mapping')}
              />
            </Box>

            {validation?.missingRequiredFields.length ? (
              <Alert severity="warning">
                <strong>{t('Missing required mapping')}:</strong>{' '}
                {validation.missingRequiredFields.map((field) => t(field.label)).join(', ')}.{' '}
                {t('Select a file column and drag the required CRM field onto it.')}
              </Alert>
            ) : null}

            {missingLeadDefaults.length ? (
              <Alert severity="warning">
                <strong>{t('Missing CRM defaults')}:</strong>{' '}
                {missingLeadDefaults.map(([label]) => t(label)).join(', ')}.{' '}
                {t('Choose these values in Lead defaults before importing.')}
              </Alert>
            ) : null}

            {validation?.rowErrors.length ? (
              <Box className="crm-data-importer-errors">
                {validation.rowErrors.slice(0, 8).map((error) => (
                  <Alert key={`${error.rowNumber}-${error.field}`} severity="error">
                    <strong>
                      {t('Row')} {error.rowNumber}: {t(error.fieldLabel)}
                    </strong>{' '}
                    - {t(error.message)}{' '}
                    {error.value ? `${t('File value')}: ${error.value}` : ''}
                  </Alert>
                ))}
                {validation.rowErrors.length > 8 ? (
                  <Typography className="crm-muted-text">
                    {validation.rowErrors.length - 8} {t('more validation errors')}
                  </Typography>
                ) : null}
              </Box>
            ) : null}

            {validation?.isValid ? (
              <Alert severity="success">{t('All mapped fields match expected field types.')}</Alert>
            ) : null}

            {importMutation.isPending ? <LinearProgress /> : null}
            <Box className="crm-data-importer-actions">
              <Button
                disabled={!canSubmitImport}
                onClick={() => importMutation.mutate()}
                variant="contained"
              >
                {importMutation.isPending ? t('Importing...') : t('Import')}
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : null}

      {importResult ? (
        <Card className="crm-card">
          <CardContent>
            <Typography variant="h6">{t('Import results')}</Typography>
            <Typography className="crm-muted-text">
              {importResult.successes.length} {t('imported')},{' '}
              {importResult.skipped?.length || 0} {t('skipped')},{' '}
              {importResult.failures.length} {t('failed')}
            </Typography>
            {importResult.skipped?.length ? (
              <Box className="crm-data-importer-errors">
                {importResult.skipped.map((skippedRow) => (
                  <Alert key={`${skippedRow.rowNumber}-${skippedRow.reason}`} severity="info">
                    {t('Row')} {skippedRow.rowNumber}: {skippedRow.reason}
                  </Alert>
                ))}
              </Box>
            ) : null}
            {importResult.failures.length ? (
              <Box className="crm-data-importer-errors">
                {importResult.failures.map((failure) => (
                  <Alert key={`${failure.rowNumber}-${failure.message}`} severity="error">
                    {t('Row')} {failure.rowNumber}: {failure.message}
                  </Alert>
                ))}
              </Box>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={summaryOpen} onClose={() => setSummaryOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('Import summary')}</DialogTitle>
        <DialogContent>
          {importResult ? (
            <Stack spacing={2}>
              <Box className="crm-data-importer-summary-grid">
                <Box>
                  <strong>{importResult.successes.length}</strong>
                  <span>{t('Imported')}</span>
                </Box>
                <Box>
                  <strong>{importResult.skipped?.length || 0}</strong>
                  <span>{t('Skipped duplicates')}</span>
                </Box>
                <Box>
                  <strong>{importResult.failures.length}</strong>
                  <span>{t('Failed')}</span>
                </Box>
              </Box>
              {importResult.skipped?.length ? (
                <Alert severity="info">
                  {t('Duplicate rows were skipped and no new record was created for them.')}
                </Alert>
              ) : null}
              {importResult.failures.length ? (
                <Alert severity="warning">
                  {t('Some rows could not be imported. Review the import results below.')}
                </Alert>
              ) : null}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSummaryOpen(false)} variant="contained">
            {t('Done')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export default SettingsDataImporterPage;
