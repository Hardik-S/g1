module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testPathIgnorePatterns: ['<rootDir>/src/apps/cache-lab/tests/'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/src/testUtils/styleMock.js',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
};
