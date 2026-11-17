// The native module does not exist under Jest. A suite that needs the calls mocks the package itself.
module.exports = {
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(async () => false),
  unregisterTaskAsync: jest.fn(async () => undefined),
};
