const getDocument = jest.fn().mockImplementation(() => {
  return {
    promise: Promise.resolve({
    }),
  };
});

const GlobalWorkerOptions = {
  workerSrc: 'mock-worker-src.js',
};

module.exports = {
  getDocument,
  GlobalWorkerOptions,
};