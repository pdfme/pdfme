import { jest } from '@jest/globals';
import { toMatchImageSnapshot } from 'jest-image-snapshot';

global.jest = jest;
global.expect = expect;
global.test = test;
global.describe = describe;
global.beforeAll = beforeAll;
global.afterAll = afterAll;
global.beforeEach = beforeEach;
global.afterEach = afterEach;

expect.extend({ toMatchImageSnapshot });
