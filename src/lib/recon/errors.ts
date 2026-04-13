export class SchemaError extends Error {
  readonly kind = 'schema' as const;
  constructor(
    public readonly sheet: string,
    public readonly missing: string[],
  ) {
    super(`Sheet "${sheet}" is missing required column(s): ${missing.join(', ')}`);
    this.name = 'SchemaError';
  }
}

export class ParseError extends Error {
  readonly kind = 'parse' as const;
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

export class PipelineError extends Error {
  readonly kind = 'pipeline' as const;
  constructor(message: string) {
    super(message);
    this.name = 'PipelineError';
  }
}
