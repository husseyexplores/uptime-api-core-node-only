/*
 * Helper fns for various tasks
 *
 */

const crypto = require('crypto')

const { hashSalt } = require('../config')

/////////////////////////////////////////////////////////////////////////////////

const helpers = {}

// SHA256 hash
helpers.hash = str => {
  if (typeof str !== 'string' || !str.length) return false

  return crypto.createHmac('sha256', hashSalt).update(str).digest('hex')
}

// Parse a JSON string to an object in all cases, without throwing
helpers.safeJSONparse = jsonString => {
  try {
    return JSON.parse(jsonString)
  } catch (e) {
    return {}
  }
}

module.exports = helpers