// Mock components that cause issues with React 18 testing
jest.mock('../../src/components/Preview', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(({ template, inputs, size }) => {
      return {
        render: jest.fn(),
        template,
        inputs,
        size
      };
    })
  };
});

jest.mock('../../src/components/Designer/index.js', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(({ template, size }) => {
      return {
        render: jest.fn(),
        template,
        size
      };
    })
  };
});

// Mock antd components that might be causing issues
jest.mock('antd', () => {
  const antd = jest.requireActual('antd');
  return {
    ...antd,
    ConfigProvider: ({ children }) => children,
    theme: {
      useToken: () => ({
        token: {
          colorPrimary: '#1890ff',
          colorBgContainer: '#ffffff',
        }
      })
    }
  };
});

// Mock @dnd-kit/core which is causing issues with hooks
jest.mock('@dnd-kit/core', () => {
  return {
    DndContext: ({ children }) => children,
    useSensor: jest.fn(),
    useSensors: jest.fn(),
    PointerSensor: jest.fn(),
    KeyboardSensor: jest.fn(),
    rectIntersection: jest.fn(),
    pointerWithin: jest.fn(),
    closestCenter: jest.fn(),
    closestCorners: jest.fn()
  };
});
