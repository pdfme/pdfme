import { runResolutionCase } from '../scripts/test-types-consumer';

const legacyCase = {
  name: 'node10',
  module: 'ESNext',
  moduleResolution: 'node',
  source: 'import-only' as const,
  allowCompilerOptionErrors: true,
};
const optionFailure = {
  status: 2,
  output: 'error TS5107: node10 is deprecated',
  diagnostics: [
    { code: '5107', message: 'node10 is deprecated', kind: 'compiler-option' as const },
  ],
};

describe('consumer resolution verification', () => {
  test('retries option errors before claiming a successful type check', () => {
    const compile = vi
      .fn()
      .mockReturnValueOnce(optionFailure)
      .mockReturnValueOnce({ status: 0, output: '', diagnostics: [] });
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      runResolutionCase('/consumer', '6.0.2', legacyCase, compile);
      expect(compile).toHaveBeenCalledTimes(2);
      expect(compile.mock.calls[1][1].compilerOptions.ignoreDeprecations).toBe('6.0');
      expect(log).toHaveBeenCalledWith('[typescript@6.0.2 node10] ok');
    } finally {
      log.mockRestore();
    }
  });

  test('fails when a retry exposes a declaration error', () => {
    const compile = vi
      .fn()
      .mockReturnValueOnce(optionFailure)
      .mockReturnValueOnce({
        status: 2,
        output: 'broken declaration',
        diagnostics: [{ code: '2307', message: 'Cannot find module', kind: 'package' }],
      });
    expect(() => runResolutionCase('/consumer', '6.0.2', legacyCase, compile)).toThrow(
      'broken declaration',
    );
    expect(compile).toHaveBeenCalledTimes(2);
  });

  test('does not accept an unexplained nonzero exit with no parsed diagnostics', () => {
    const compile = vi
      .fn()
      .mockReturnValue({ status: 1, output: 'compiler crashed', diagnostics: [] });
    expect(() => runResolutionCase('/consumer', '6.0.2', legacyCase, compile)).toThrow(
      'compiler crashed',
    );
  });

  test('reports unsupported legacy options as unverified, not usable', () => {
    const compile = vi.fn().mockReturnValue(optionFailure);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      runResolutionCase('/consumer', '7.0.2', legacyCase, compile);
      expect(compile).toHaveBeenCalledTimes(3);
      expect(log).toHaveBeenCalledWith(expect.stringContaining('package types were not checked'));
    } finally {
      log.mockRestore();
    }
  });

  test('does not skip compiler option errors for required NodeNext verification', () => {
    const compile = vi.fn().mockReturnValue(optionFailure);
    expect(() =>
      runResolutionCase(
        '/consumer',
        '6.0.2',
        {
          ...legacyCase,
          name: 'NodeNext',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          allowCompilerOptionErrors: false,
        },
        compile,
      ),
    ).toThrow('failed');
  });
});
