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

helpers.isString = value => typeof value === 'string'
helpers.isNumber = value => typeof value === 'number'
helpers.isObject = value => typeof value === 'object' && Array.isArray(value) === false
helpers.isArray = value => typeof value === 'object' && Array.isArray(value)
helpers.isInteger = value => Number.isInteger(value)
helpers.inRange = (value, min, max) => value >= min && value <= max
helpers.hasLength = arr => helpers.isArray(arr) && arr.length > 0
helpers.lowerCase = value => {
  if (helpers.isString(value)) {
    return value.toLowerCase()
  }

  if (helpers.isArray(value)) {
    return value.map(v => helpers.isString(v) ? v.toLowerCase() : v)
  }
}

helpers.arrayOf = (type, arr) => {
  if (!Array.isArray(arr)) return false

  const types = {
    numbers: v => typeof v === 'number',
    integers: v => Number.isInteger(v),
    strings: v => typeof v === 'string',
    arrays: v => Array.isArray(v),
    objects: v => helpers.isObject(v),
  }

  return types[type] ? arr.every(v => types[type](v)) : false
}

module.exports = helpers