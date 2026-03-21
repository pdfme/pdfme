import date from '../src/date/date.js';
import dateTime from '../src/date/dateTime.js';
import {
  getAirDatepickerLocale,
  getFmtValue,
  getFormat,
  getSafeFormat,
} from '../src/date/helper.js';
import type { DateSchema } from '../src/date/types.js';

describe('date format normalization', () => {
  const enLocale = getAirDatepickerLocale('en');
  const jaLocale = getAirDatepickerLocale('ja');

  it('keeps default schema formats populated', () => {
    expect(date.propPanel.defaultSchema.format).toBe('MM/dd/yyyy');
    expect(dateTime.propPanel.defaultSchema.format).toBe('MM/dd/yyyy hh:mm aa');
  });

  it('falls back to the locale default when the format is missing', () => {
    const schema = { format: undefined } as unknown as DateSchema;

    expect(getSafeFormat('date', schema, enLocale)).toBe(getFormat('date', enLocale));
    expect(getFmtValue('2024/01/02', 'date', schema, enLocale)).toBe('01/02/2024');
  });

  it('falls back to the locale default when the format is the string undefined', () => {
    const schema = { format: 'undefined' } as DateSchema;

    expect(getSafeFormat('dateTime', schema, enLocale)).toBe(getFormat('dateTime', enLocale));
    expect(getFmtValue('2024/01/02 13:05', 'dateTime', schema, enLocale)).toBe(
      '01/02/2024 01:05 PM',
    );
  });

  it('backfills locale and format for date schemas in the prop panel', () => {
    const changeSchemas = vi.fn();
    const schema = date.propPanel.schema as (arg: Record<string, unknown>) => unknown;

    schema({
      options: { lang: 'ja' },
      i18n: (key: string) => key,
      activeSchema: { id: 'date-1', type: 'date' },
      changeSchemas,
    });

    expect(changeSchemas).toHaveBeenCalledWith([
      { schemaId: 'date-1', key: 'locale', value: 'ja' },
      { schemaId: 'date-1', key: 'format', value: getFormat('date', jaLocale) },
    ]);
  });

  it('backfills invalid dateTime formats in the prop panel', () => {
    const changeSchemas = vi.fn();
    const schema = dateTime.propPanel.schema as (arg: Record<string, unknown>) => unknown;

    schema({
      options: { lang: 'en' },
      i18n: (key: string) => key,
      activeSchema: { id: 'date-time-1', type: 'dateTime', locale: 'en', format: 'undefined' },
      changeSchemas,
    });

    expect(changeSchemas).toHaveBeenCalledWith([
      { schemaId: 'date-time-1', key: 'format', value: getFormat('dateTime', enLocale) },
    ]);
  });
});
