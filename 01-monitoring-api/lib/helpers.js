/*
 * Helper fns for various tasks
 *
 */

const crypto = require('crypto')
const querystring = require('querystring')
const https = require('https')
const path = require('path')
const fs = require('fs')

const { hashSalt, twilio, templateGlobals } = require('../config')

/////////////////////////////////////////////////////////////////////////////////

const helpers = {}

// Sample fn for testing
helpers.getANumber = (n = 1) => n;


// Helpers
helpers.verticalSpace = (n = 1) => {
  if (!Number.isInteger(n)) n = 1
  for (let i = 0; i < n; i++) {
    console.log('')
  }
}

helpers.horizontalLine = () => {
  // Get the available screen size
  const width = process.stdout.columns
  let line = ''
  for (let i = 0; i < width; i++) {
    line += '#'
  }
  console.log(line)
}

helpers.centered = str => {
  str = typeof str !== 'string' ? String(str.trim()) : str.trim()
  const width = process.stdout.columns

  // calculate the left padding there should be
  const paddingOnEachSide = Math.floor((width - str.length) / 2)
  const spaces = ' '.repeat(paddingOnEachSide)

  // Put in left padded spaced before the string, then add the string
  const line = spaces + str
  console.log(line)
}

helpers.centerSection = (name = 'Section Name') => {
  helpers.verticalSpace()
  helpers.centered(`============= ${name} =============`)
  helpers.verticalSpace()
}

helpers.leftSection = (name = 'Section Name') => {
  helpers.verticalSpace()
  console.log(`======================== ${name} ======================== `)
  helpers.verticalSpace()
}

helpers.percent = (value, total) => Math.round((value / total) * 100)

helpers.formatTime = seconds => {
  const pad = n => (n < 10 ? '0' : '') + n
  const hours = Math.floor(seconds / (60 * 60))
  const minutes = Math.floor(seconds % (60 * 60) / 60)
  seconds = Math.floor(seconds % 60)
  return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds)
}

helpers.jsonHightlight = json => {
  const resetColor = '\x1b[0m'
  const yellow = '\x1b[33m'
  const magenta = '\x1b[35m'
  const cyan = '\x1b[36m'
  const red = '\x1b[31m'
  const green = '\x1b[32m'

  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
      let color = yellow;
      if (/^"/.test(match)) {
          if (/:$/.test(match)) {
              color = red;
          } else {
              color = green;
          }
      } else if (/true|false/.test(match)) {
          color = cyan;
      } else if (/null/.test(match)) {
          color = magenta;
      }
      return color + match + resetColor;
  });
}

helpers.yellow = str => `\x1b[33m${str}\x1b[0m`
helpers.green = str => `\x1b[32m${str}\x1b[0m`
helpers.red = str => `\x1b[31m${str}\x1b[0m`
helpers.cyan = str => `\x1b[36m${str}\x1b[0m`
helpers.magenta = str => `\x1b[35m${str}\x1b[0m`


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

// Send SMS via twilio
helpers.sendtwilioSMS = (phone, msg, callback = () => {}) => {
  const msgLength = msg.trim().length
  // Sanity checks
  phone = helpers.isString(phone) && phone.trim().length === 10 && phone
  msg = helpers.isString(msg) && helpers.inRange(msgLength, 1, 1600) && msg

  if (!phone || !msg) return callback('Error Sending SMS. Given params were missing or invalid.')

  // Configure the request payload
  const payload = {
    From: twilio.fromPhone,
    To: '+1' + phone,
    Body: msg
  }
  const stringifiedPayload = querystring.stringify(payload)

  // Congigure the request details
  const requestDetails = {
    protocol: 'https:',
    hostname: 'api.twilio.com',
    method: 'POST',
    path: `/2010-04-01/Accounts/${twilio.accountSid}/Messages.json`,
    auth: `${twilio.accountSid}:${twilio.authToken}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(stringifiedPayload),
    }
  }

  // Instantiate the request object
  const request = https.request(requestDetails, response => {
    // Grab the status of the sent request
    const { statusCode, on } = response

    let body = '';
    response.on('data', function(chunk) {
      body += chunk;
    })

    response.on('end', function() {
      let err = null;
      if (statusCode !== 200 && statusCode !== 201) {
        err = `Status code returned was: ${statusCode}`
      }
      callback(err, body)
    })
  })

  // Bind to the error event so it doesn't get thrown
  request.on('error', err => callback(err))

  // Add the payload
  request.write(stringifiedPayload)

  // End the request - (Send)
  request.end()
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

// Get the string content of a template
helpers.getTemplate = (templateName, data, callback) => {
  templateName = helpers.isString(templateName) && templateName.length > 0 && templateName
  data = helpers.isObject(data) ? data : {}
  if (!templateName) return callback('A valid template name was not specified.')

  const templatesDir = path.join(__dirname, '../templates')
  fs.readFile(`${templatesDir}/${templateName}.html`, 'utf-8', (err, templateData) => {
    if (err || !templateData) {
      return callback('Error reading template data.')
    }
    // Do the interpolation on the string
    const finalString = helpers.interpolate(templateData, data)
    callback(null, finalString)
  })
}

// Add the universal header and footer to a string and pass the provided
// data object to the header to the header and footer for interpolation
helpers.addPartialTemplates = (contentHtml, data, callback) => {
  contentHtml = helpers.isString(contentHtml) && contentHtml.length > 0 ? contentHtml : ''
  data = helpers.isObject(data) ? data : {}

  // Get the header
  helpers.getTemplate('_header', data, (err, headerHtml) => {
    if (err || !headerHtml) return callback('Could not find the header template.')

    // Get the footer
    helpers.getTemplate('_footer', data, (err, footerHtml) => {
      if (err || !footerHtml) return callback('Could not find the footer template.')

      // Add these strings together
      const fullPageHTML = headerHtml + contentHtml + footerHtml
      callback(null, fullPageHTML)
    })
  })
}

// Take a given string and data object and find/replace all the keys within it
helpers.interpolate = (str, data) => {
  str = helpers.isString(str) && str.length > 0 ? str : ''
  data = helpers.isObject(data) ? data : {}

  // Add the template globals to the data object, prepending it with their key name "global"
  for (let key in templateGlobals) {
    if (templateGlobals.hasOwnProperty(key)) {
      data[`global.${key}`] = templateGlobals[key]
    }
  }

  // For each in key in the data object, insert its value into the string at the corresponding placeholder
  for (let key in data) {
    if (data.hasOwnProperty(key) && (helpers.isString(data[key]) || helpers.isNumber(data[key]))) {
      const replace = data[key]
      const find = `{${key}}`
      str = str.replace(find, replace)
    }
  }

  return str
}

// Returns the static asset from the public directory
helpers.getStaticAsset = (name, callback) => {
  name = helpers.isString(name) && name.length > 0 && name
  if (!name) return callback('A valid asset filename was not specified.')

  const publicDir = path.join(__dirname, '../public')

  fs.readFile(`${publicDir}/${name}`, (err, data) => {
    if (err || !data) return callback(`Could not find the asset ${name}`)

    callback(null, data)
  })
}

module.exports = helpers