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

// Random string generator - Alpha numeric
helpers.createRandomString = length => {
  if (typeof(length) !== 'number' || length < 1) {
    return false
  }

  // Define all the possible character that could go into a string
  const possibleChars = 'qwertyuiopasdfghjklzxcvbnm0123456789'

  let str = ''

  for (let i = 1; i <= length; i++) {
    // Get a random character
    const randomChar = possibleChars.charAt(Math.floor(Math.random() * possibleChars.length))

    // Append it to the resulting string
    str += randomChar
  }

  return str
}

module.exports = helpers