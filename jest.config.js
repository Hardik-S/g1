module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/src/testUtils/styleMock.js',
  },
};
