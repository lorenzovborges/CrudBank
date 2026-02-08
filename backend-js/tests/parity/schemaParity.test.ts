import fs from 'fs';
import path from 'path';

describe('schema parity with backend-java', () => {
  it('keeps SDL byte-for-byte equal to Java reference schema', () => {
    const javaPath = path.resolve(
      process.cwd(),
      '..',
      'backend-java',
      'src',
      'main',
      'resources',
      'graphql',
      'schema.graphqls',
    );
    const jsPath = path.resolve(process.cwd(), 'src', 'graphql', 'schema.graphqls');

    const javaSchema = fs.readFileSync(javaPath);
    const jsSchema = fs.readFileSync(jsPath);

    expect(Buffer.compare(jsSchema, javaSchema)).toBe(0);
  });
});
