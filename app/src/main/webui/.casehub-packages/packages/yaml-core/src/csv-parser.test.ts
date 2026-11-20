import { describe, it, expect } from 'vitest';
import { CsvParser } from './csv-parser.js';

describe('CsvParser', () => {
  it('parses string columns', () => {
    const ds = CsvParser.parse('envs',
      'name:STRING,region:STRING\nalpha,us-east\nbeta,eu-west');
    expect(ds.name).toBe('envs');
    expect(ds.columns).toEqual([
      { name: 'name', type: 'STRING' },
      { name: 'region', type: 'STRING' },
    ]);
    expect(ds.rows).toHaveLength(2);
    expect(ds.rows[0]).toEqual({ name: 'alpha', region: 'us-east' });
    expect(ds.rows[1]).toEqual({ name: 'beta', region: 'eu-west' });
  });

  it('parses integer column', () => {
    const ds = CsvParser.parse('services',
      'name:STRING,port:INTEGER\nweb,8080\napi,9090');
    expect(ds.rows[0]!['port']).toBe(8080);
    expect(ds.rows[1]!['port']).toBe(9090);
  });

  it('parses boolean column via truthiness', () => {
    const ds = CsvParser.parse('flags',
      'name:STRING,enabled:BOOLEAN\nfeature-a,true\nfeature-b,no\nfeature-c,1');
    expect(ds.rows[0]!['enabled']).toBe(true);
    expect(ds.rows[1]!['enabled']).toBe(false);
    expect(ds.rows[2]!['enabled']).toBe(true);
  });

  it('parses number column', () => {
    const ds = CsvParser.parse('tiers',
      'name:STRING,rate:NUMBER\ngold,0.05\nsilver,1.5');
    expect(ds.rows[0]!['rate']).toBe(0.05);
    expect(ds.rows[1]!['rate']).toBe(1.5);
  });

  it('parses mixed types', () => {
    const ds = CsvParser.parse('mixed',
      'name:STRING,port:INTEGER,enabled:BOOLEAN,rate:NUMBER\nweb,8080,true,0.95');
    const row = ds.rows[0]!;
    expect(row).toEqual({ name: 'web', port: 8080, enabled: true, rate: 0.95 });
  });

  it('header only returns empty rows', () => {
    const ds = CsvParser.parse('empty', 'name:STRING,port:INTEGER\n');
    expect(ds.columns).toHaveLength(2);
    expect(ds.rows).toHaveLength(0);
  });

  it('trims whitespace from values', () => {
    const ds = CsvParser.parse('trimmed',
      'name:STRING , port:INTEGER\n alpha , 8080');
    expect(ds.columns[0]).toEqual({ name: 'name', type: 'STRING' });
    expect(ds.rows[0]).toEqual({ name: 'alpha', port: 8080 });
  });

  it('skips blank lines', () => {
    const ds = CsvParser.parse('blanks',
      'name:STRING\nalpha\n\nbeta');
    expect(ds.rows).toHaveLength(2);
    expect(ds.rows[0]!['name']).toBe('alpha');
    expect(ds.rows[1]!['name']).toBe('beta');
  });

  it('integer parse error includes row and column', () => {
    expect(() => CsvParser.parse('bad',
      'name:STRING,port:INTEGER\nweb,not-a-number'))
      .toThrow(/row 1.*port.*INTEGER/);
  });

  it('number parse error includes row and column', () => {
    expect(() => CsvParser.parse('bad',
      'name:STRING,rate:NUMBER\nweb,abc'))
      .toThrow(/row 1.*rate.*NUMBER/);
  });

  it('boolean parse error includes row and column', () => {
    expect(() => CsvParser.parse('bad',
      'name:STRING,enabled:BOOLEAN\nweb,maybe'))
      .toThrow(/row 1.*enabled/);
  });

  it('wrong column count in row throws', () => {
    expect(() => CsvParser.parse('short',
      'name:STRING,port:INTEGER\nweb'))
      .toThrow(/row 1/);
  });

  it('unknown column type throws', () => {
    expect(() => CsvParser.parse('bad', 'name:BLOB\nalpha'))
      .toThrow('BLOB');
  });

  it('empty content throws', () => {
    expect(() => CsvParser.parse('empty', '')).toThrow();
  });

  it('whitespace only content throws', () => {
    expect(() => CsvParser.parse('empty', '   \n  \n')).toThrow();
  });

  it('missing type in header throws', () => {
    expect(() => CsvParser.parse('bad', 'name\nalpha'))
      .toThrow('columnName:TYPE');
  });

  it('type is case insensitive', () => {
    const ds = CsvParser.parse('lower',
      'name:string,port:integer\nweb,8080');
    expect(ds.columns[0]!.type).toBe('STRING');
    expect(ds.rows[0]!['port']).toBe(8080);
  });
});

describe('CsvParser.fromDataBlock', () => {
  it('extracts inline csv', () => {
    const result = CsvParser.fromDataBlock({
      members: { inline: 'name:STRING,role:STRING\nAlice,Dev\nBob,PM' },
      lookup: { key: 'value' },
    });
    expect(result['members']).toBeDefined();
    expect(result['lookup']).toBeUndefined();
    expect(result['members']!.rows).toHaveLength(2);
  });

  it('empty data returns empty', () => {
    const result = CsvParser.fromDataBlock({});
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('no inline entries returns empty', () => {
    const result = CsvParser.fromDataBlock({
      lookup: { source: 'external.csv' },
    });
    expect(Object.keys(result)).toHaveLength(0);
  });
});
