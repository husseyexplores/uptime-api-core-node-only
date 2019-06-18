const { twilio } = require('./secret')

const environments = {}

const templateGlobals = {
  appName: 'Uptime Checker',
  companyName: 'Husseyexplores.',
  yearCreated: 2019,
  baseUrl: 'http://localhost:3000/',
}

//  Staging (default) env
environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'staging',
  hashSalt: 'thisIsAsuperSecretHashingSalt',
  maxChecks: 5,
  twilio,
  templateGlobals: { ...templateGlobals },

}

//  Production env
environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'production',
  hashSalt: 'thisIsAsuperSecretHashingSalt',
  maxChecks: 5,
  twilio,
  templateGlobals: {
    ...templateGlobals,
    baseUrl: 'http://localhost:5000/',
  }
}

const currentEnv = typeof process.env.NODE_ENV === 'string' ? process.env.NODE_ENV.toLowerCase() : ''

module.exports = environments[currentEnv] || environments.staging
