declare module 'jest-image-snapshot' {
  export interface MatchImageSnapshotOptions {
    failureThreshold?: number;
    failureThresholdType?: string;
    blur?: number;
    customDiffConfig?: { threshold?: number };
    customSnapshotIdentifier?: string;
  }

  global {
    namespace jest {
      interface Matchers<R> {
        toMatchImageSnapshot(options?: MatchImageSnapshotOptions): R;
      }
    }
  }
}
