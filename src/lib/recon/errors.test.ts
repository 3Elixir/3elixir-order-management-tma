import { test, expect } from 'vitest';
import { SchemaError, ParseError, PipelineError } from './errors';

test('SchemaError carries sheet and missing columns', () => {
  const err = new SchemaError('Income', ['Foo', 'Bar']);
  expect(err.kind).toBe('schema');
  expect(err.sheet).toBe('Income');
  expect(err.missing).toEqual(['Foo', 'Bar']);
  expect(err.message).toContain('Income');
  expect(err.message).toContain('Foo');
});

test('ParseError carries underlying message', () => {
  const err = new ParseError('not an xlsx');
  expect(err.kind).toBe('parse');
  expect(err.message).toBe('not an xlsx');
});

test('PipelineError carries message', () => {
  const err = new PipelineError('boom');
  expect(err.kind).toBe('pipeline');
  expect(err.message).toBe('boom');
});
