export const importTargets = {
  contacts: 'contacts',
  leads: 'leads',
};

export const contactImportFields = [
  { key: 'salutation', label: 'Salutation', type: 'text' },
  { key: 'fullName', label: 'Full name', type: 'text', required: true },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone', type: 'phone' },
  { key: 'companyName', label: 'Company name', type: 'text' },
];

export const leadImportFields = [
  { key: 'title', label: 'Inquiry', type: 'text' },
  { key: 'contactSalutation', label: 'Salutation', type: 'text' },
  { key: 'contactName', label: 'Full name', type: 'text', required: true },
  { key: 'contactEmail', label: 'Email', type: 'email' },
  { key: 'contactPhone', label: 'Phone', type: 'phone' },
  { key: 'message', label: 'Message', type: 'text' },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phonePattern = /^\+?\d+$/;
const leadStatuses = ['Open', 'Won', 'Lost', 'Archived'];
const maxImportFileSizeBytes = 5 * 1024 * 1024;
const maxImportRows = 5000;

const fieldAliasesByTarget = {
  [importTargets.contacts]: {
    salutation: ['salutation', 'title prefix'],
    fullName: ['name', 'full name', 'fullname', 'contact name', 'member name'],
    email: ['email', 'email address', 'mail'],
    phone: ['phone', 'phone number', 'phonenumber', 'mobile', 'mobile number', 'telephone'],
    companyName: ['company', 'company name', 'organization', 'organisation'],
  },
  [importTargets.leads]: {
    title: ['inquiry', 'title', 'lead title', 'deal title'],
    contactSalutation: ['salutation', 'title prefix'],
    contactName: ['name', 'full name', 'fullname', 'contact name', 'member name'],
    contactEmail: ['email', 'email address', 'mail'],
    contactPhone: ['phone', 'phone number', 'phonenumber', 'mobile', 'mobile number', 'telephone'],
    message: ['message', 'notes', 'comment'],
  },
};

function normalizeHeader(value, index, usedHeaders) {
  const baseHeader = String(value || '').trim() || `Column ${index + 1}`;
  let header = baseHeader;
  let suffix = 2;

  while (usedHeaders.has(header)) {
    header = `${baseHeader} ${suffix}`;
    suffix += 1;
  }

  usedHeaders.add(header);
  return header;
}

function normalizeCell(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

export async function parseImportFile(file, { firstRowHasHeaders = true } = {}) {
  if (file.size && file.size > maxImportFileSizeBytes) {
    throw new Error('Import files must be 5 MB or smaller.');
  }

  const { read, utils } = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, {
    cellDates: true,
    raw: false,
    type: 'array',
  });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error('The selected file does not contain any sheets.');
  }

  const sheetRows = utils.sheet_to_json(workbook.Sheets[firstSheetName], {
    blankrows: false,
    defval: '',
    header: 1,
    raw: false,
  });

  if (firstRowHasHeaders && sheetRows.length < 2) {
    throw new Error('The selected file must include a header row and at least one data row.');
  }

  if (!firstRowHasHeaders && sheetRows.length < 1) {
    throw new Error('The selected file does not contain importable rows.');
  }

  const usedHeaders = new Set();
  const headerRow = firstRowHasHeaders
    ? sheetRows[0]
    : Array.from(
        { length: Math.max(...sheetRows.map((row) => row.length)) },
        (_, index) => `Column ${index + 1}`,
      );
  const headers = headerRow.map((header, index) => normalizeHeader(header, index, usedHeaders));
  const rows = sheetRows
    .slice(firstRowHasHeaders ? 1 : 0)
    .map((row, rowIndex) => {
      const record = { __rowNumber: rowIndex + (firstRowHasHeaders ? 2 : 1) };

      headers.forEach((header, index) => {
        record[header] = normalizeCell(row[index]);
      });

      return record;
    })
    .filter((row) => headers.some((header) => row[header]));

  if (rows.length === 0) {
    throw new Error('The selected file does not contain importable rows.');
  }

  if (rows.length > maxImportRows) {
    throw new Error('Import files can contain up to 5,000 rows.');
  }

  return {
    headers,
    rows,
    sheetName: firstSheetName,
  };
}

export function getFieldsForTarget(target) {
  return target === importTargets.leads ? leadImportFields : contactImportFields;
}

export function inferImportMapping(target, headers) {
  const aliases = fieldAliasesByTarget[target] || {};
  const usedFields = new Set();

  return headers.reduce((mapping, header) => {
    const normalizedHeader = normalizeLookupValue(header).replace(/[_-]/g, ' ');
    const matchedEntry = Object.entries(aliases).find(([fieldKey, fieldAliases]) => {
      if (usedFields.has(fieldKey)) {
        return false;
      }

      return fieldAliases.some((alias) => normalizeLookupValue(alias) === normalizedHeader);
    });

    if (matchedEntry) {
      const [fieldKey] = matchedEntry;
      mapping[header] = fieldKey;
      usedFields.add(fieldKey);
    }

    return mapping;
  }, {});
}

function normalizeLookupValue(value) {
  return String(value || '').trim().toLowerCase();
}

function findLookupOption(value, options, keys) {
  const normalizedValue = normalizeLookupValue(value);

  if (!normalizedValue) {
    return null;
  }

  return options.find((option) =>
    keys.some((key) => normalizeLookupValue(option[key]) === normalizedValue),
  ) || null;
}

function validateValue(value, field, context) {
  if (field.required && !value) {
    return 'Required value is missing.';
  }

  if (!value) {
    return null;
  }

  if (field.type === 'email' && !emailPattern.test(value)) {
    return 'Expected a valid email address.';
  }

  if (field.type === 'phone' && !phonePattern.test(value)) {
    return 'Expected numbers with an optional leading + only.';
  }

  if (field.type === 'number' && Number.isNaN(Number(value.replaceAll(',', '')))) {
    return 'Expected a number.';
  }

  if (field.type === 'status' && !leadStatuses.includes(value)) {
    return `Expected one of: ${leadStatuses.join(', ')}.`;
  }

  if (field.key === 'source' && !findLookupOption(value, context.sourceOptions, ['id', 'name', 'code'])) {
    return 'No matching source was found.';
  }

  if (field.key === 'stageId' && !findLookupOption(value, context.stageOptions, ['id', 'name'])) {
    return 'No matching pipeline stage was found.';
  }

  if (
    field.key === 'ownerUserId' &&
    !findLookupOption(value, context.ownerOptions, ['id', 'fullName', 'email'])
  ) {
    return 'No matching assigned user was found.';
  }

  return null;
}

export function buildFieldValues(row, headers, mapping, fields) {
  return fields.reduce((values, field) => {
    const sourceHeader = headers.find((header) => mapping[header] === field.key);

    values[field.key] = sourceHeader ? normalizeCell(row[sourceHeader]) : '';
    return values;
  }, {});
}

export function validateImportRows({
  target,
  headers,
  mapping,
  rows,
  defaults = {},
  sourceOptions = [],
  stageOptions = [],
  ownerOptions = [],
}) {
  const fields = getFieldsForTarget(target);
  const mappedFieldKeys = new Set(Object.values(mapping).filter(Boolean));
  const missingRequiredFields = fields.filter((field) => {
    if (!field.required) {
      return false;
    }

    return !mappedFieldKeys.has(field.key);
  });
  const rowErrors = [];
  const context = {
    ownerOptions,
    sourceOptions,
    stageOptions,
  };

  rows.forEach((row) => {
    const values = buildFieldValues(row, headers, mapping, fields);

    fields.forEach((field) => {
      if (!mappedFieldKeys.has(field.key)) {
        return;
      }

      const error = validateValue(values[field.key], field, context);

      if (error) {
        rowErrors.push({
          field: field.key,
          fieldLabel: field.label,
          message: error,
          rowNumber: row.__rowNumber,
          value: values[field.key],
        });
      }
    });
  });

  return {
    isValid: missingRequiredFields.length === 0 && rowErrors.length === 0,
    missingRequiredFields,
    rowErrors,
  };
}

export function createImportPayload({
  target,
  row,
  headers,
  mapping,
  defaults,
  sourceOptions = [],
  stageOptions = [],
  ownerOptions = [],
}) {
  const fields = getFieldsForTarget(target);
  const values = buildFieldValues(row, headers, mapping, fields);

  if (target === importTargets.contacts) {
    return {
      salutation: values.salutation || null,
      fullName: values.fullName,
      email: values.email || null,
      phone: values.phone || null,
      companyName: values.companyName || null,
    };
  }

  const source = values.source
    ? findLookupOption(values.source, sourceOptions, ['id', 'name', 'code'])
    : null;
  const stage = values.stageId
    ? findLookupOption(values.stageId, stageOptions, ['id', 'name'])
    : null;
  const owner = values.ownerUserId
    ? findLookupOption(values.ownerUserId, ownerOptions, ['id', 'fullName', 'email'])
    : null;
  const serviceRequested = values.serviceRequested || defaults.serviceRequested || '';
  const contactName = values.contactName;
  const title = values.title || [serviceRequested, contactName].filter(Boolean).join(' - ');
  const estimatedCost = values.estimatedCost || defaults.estimatedCost || '';

  return {
    contactId: '',
    contactSalutation: values.contactSalutation || null,
    contactName,
    contactEmail: values.contactEmail || '',
    contactPhone: values.contactPhone || '',
    sourceId: source?.id || defaults.sourceId || '',
    stageId: stage?.id || defaults.stageId || '',
    ownerUserId: owner?.id || defaults.ownerUserId || '',
    status: values.status || defaults.status || 'Open',
    title: title || contactName,
    estimatedCost: estimatedCost ? Number(String(estimatedCost).replaceAll(',', '')) : null,
    serviceRequested,
    message: values.message || '',
  };
}

function normalizeDuplicateValue(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhoneDuplicateValue(value) {
  return String(value || '').replace(/[^\d+]/g, '');
}

export function getImportDuplicateKeys(target, record) {
  const email = normalizeDuplicateValue(
    target === importTargets.contacts ? record.email : record.contactEmail || record.email,
  );
  const phone = normalizePhoneDuplicateValue(
    target === importTargets.contacts ? record.phone : record.contactPhone || record.phone,
  );

  return [
    email ? `email:${email}` : '',
    phone ? `phone:${phone}` : '',
  ].filter(Boolean);
}

export function buildExistingImportDuplicateKeys(target, records = []) {
  return new Set(records.flatMap((record) => getImportDuplicateKeys(target, record)));
}
