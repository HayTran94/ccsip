module.exports = {
  verbose: true,
  testEnvironment: 'node',
  moduleFileExtensions: [
    'js',
    'node'
  ],
  testRegex: '/spec/.*\\.(js)x?$',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js'
  ]
};
