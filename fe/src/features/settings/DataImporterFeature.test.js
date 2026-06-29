import { describe, expect, it } from 'vitest';
import {
  buildExistingImportDuplicateKeys,
  createImportPayload,
  getImportDuplicateKeys,
  inferImportMapping,
  importTargets,
  parseImportFile,
  validateImportRows,
} from './dataImporter.js';

describe('Data importer helpers', () => {
  it('parses CSV files and validates mapped contact fields', async () => {
    const file = {
      arrayBuffer: () =>
        Promise.resolve(
          new TextEncoder().encode('Name,Email,Phone\nRida Sharari,rida@example.com,+96170123456')
            .buffer,
        ),
    };
    const parsedFile = await parseImportFile(file);
    const mapping = {
      Name: 'fullName',
      Email: 'email',
      Phone: 'phone',
    };

    expect(parsedFile.headers).toEqual(['Name', 'Email', 'Phone']);
    expect(parsedFile.rows).toHaveLength(1);
    expect(
      validateImportRows({
        target: importTargets.contacts,
        headers: parsedFile.headers,
        mapping,
        rows: parsedFile.rows,
      }).isValid,
    ).toBe(true);
    expect(
      createImportPayload({
        target: importTargets.contacts,
        row: parsedFile.rows[0],
        headers: parsedFile.headers,
        mapping,
        defaults: {},
      }),
    ).toMatchObject({
      fullName: 'Rida Sharari',
      email: 'rida@example.com',
      phone: '+96170123456',
    });
  });

  it('can import files where the first row is data instead of column titles', async () => {
    const file = {
      arrayBuffer: () =>
        Promise.resolve(
          new TextEncoder().encode('Rida Sharari,rida@example.com,+96170123456').buffer,
        ),
    };
    const parsedFile = await parseImportFile(file, { firstRowHasHeaders: false });

    expect(parsedFile.headers).toEqual(['Column 1', 'Column 2', 'Column 3']);
    expect(parsedFile.rows[0]).toMatchObject({
      __rowNumber: 1,
      'Column 1': 'Rida Sharari',
      'Column 2': 'rida@example.com',
      'Column 3': '+96170123456',
    });
  });

  it('auto maps common exported member columns', () => {
    expect(
      inferImportMapping(importTargets.leads, ['Email', 'Name', 'PhoneNumber']),
    ).toEqual({
      Email: 'contactEmail',
      Name: 'contactName',
      PhoneNumber: 'contactPhone',
    });
    expect(
      inferImportMapping(importTargets.contacts, ['Email', 'Name', 'PhoneNumber']),
    ).toEqual({
      Email: 'email',
      Name: 'fullName',
      PhoneNumber: 'phone',
    });
  });

  it('flags invalid lead field types before import', () => {
    const rows = [
      {
        __rowNumber: 2,
        Name: 'Amer',
        Email: 'amer@example',
      },
    ];
    const result = validateImportRows({
      target: importTargets.leads,
      headers: ['Name', 'Email'],
      mapping: {
        Name: 'contactName',
        Email: 'contactEmail',
      },
      rows,
    });

    expect(result.isValid).toBe(false);
    expect(result.rowErrors.map((error) => error.field)).toEqual(['contactEmail']);
  });

  it('creates lead payloads with CRM defaults', () => {
    const row = {
      __rowNumber: 2,
      Name: 'Ahmad Ali',
      Inquiry: 'Plastic Surgery',
    };
    const payload = createImportPayload({
      target: importTargets.leads,
      row,
      headers: ['Name', 'Inquiry'],
      mapping: {
        Name: 'contactName',
        Inquiry: 'title',
      },
      defaults: {
        estimatedCost: '2500',
        ownerUserId: 'user-1',
        serviceRequested: 'Hair Transplant',
        sourceId: 'source-1',
        stageId: 'stage-1',
        status: 'Open',
      },
    });

    expect(payload).toMatchObject({
      contactName: 'Ahmad Ali',
      estimatedCost: 2500,
      ownerUserId: 'user-1',
      sourceId: 'source-1',
      stageId: 'stage-1',
      status: 'Open',
      title: 'Plastic Surgery',
      serviceRequested: 'Hair Transplant',
    });
  });

  it('builds duplicate keys from existing leads and import payloads', () => {
    const existingKeys = buildExistingImportDuplicateKeys(importTargets.leads, [
      {
        email: 'Rida@Example.com',
        phone: '+961 70 123 456',
      },
    ]);

    expect(existingKeys.has('email:rida@example.com')).toBe(true);
    expect(existingKeys.has('phone:+96170123456')).toBe(true);
    expect(
      getImportDuplicateKeys(importTargets.leads, {
        contactEmail: 'rida@example.com',
        contactPhone: '+96170123456',
      }).some((key) => existingKeys.has(key)),
    ).toBe(true);
  });
});
