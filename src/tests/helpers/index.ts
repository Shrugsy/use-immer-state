const originalConsoleError = console.error;
const mockedConsoleError = jest.spyOn(console, 'error');

/**
 * Allows for muting & unmuting console errors within tests on command.
 *
 * Useful to temporarily silence expected console errors in test output
 *
 * Note that the 'restore' function is only expected to be used if jest
 * is not configured to restore mocks in between tests
 */
export const mockConsoleError = {
  mute: () => mockedConsoleError.mockImplementation(() => null),
  unmute: () => mockedConsoleError.mockImplementation(originalConsoleError),
  restore: () => mockedConsoleError.mockRestore(),
};
