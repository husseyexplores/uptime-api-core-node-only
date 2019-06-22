/*
 * Router Request Handlers
 *
 */

 const dataLib = require('./data')
 const {
  hasLength,
  arrayOf,
  isInteger,
  isString,
  isArray,
  inRange,
  lowerCase,
  createRandomString,
  hash,
  getTemplate,
  addPartialTemplates,
  getStaticAsset,
 } = require('./helpers')
 const { maxChecks } = require('../config')

 /////////////////////////////////////////////////////////////////////////////////

 const handlers = {}
 /*

 * HTML handlers
 *
 */

// Index handler
handlers.index = (data, callback) => {
  if (data.method !== 'get') {
    return callback(405, undefined, 'html')
  }

  // Prepare data for interpolation
  const templateData = {
    'head.title': 'Uptime Monitoring - Made Simple',
    'head.description': 'We offer free, simple uptime monitoring for HTTP/HTTPS sites of all kinds. When your site goes down, we\'ll send you a text to let you know.',
    'body.class': 'index',
  }

  // Read in a template as a string
  getTemplate('index', templateData, (err, indexHtml) => {
    if (err || !indexHtml) {
      return callback(500, undefined, 'html')
    }
    // Add the universal header and footer
    addPartialTemplates(indexHtml, templateData, (err, fullPageHTML) => {
      if (err || !fullPageHTML) return callback(500, '<p>Internal Server Error</p>', 'html')

      // Return the final html back to the requester
      callback(200, fullPageHTML, 'html')
    })
  })
}

// Create account handler
handlers.accountCreate = (data, callback) => {
  if (data.method !== 'get') {
    return callback(405, undefined, 'html')
  }

  // Prepare data for interpolation
  const templateData = {
    'head.title': 'Create an Account',
    'head.description': 'Sign up is easy and only taks a few seconds.',
    'body.class': 'accountCreate',
  }

  // Read in a template as a string
  getTemplate('accountCreate', templateData, (err, contentHTML) => {
    if (err || !contentHTML) {
      return callback(500, undefined, 'html')
    }
    // Add the universal header and footer
    addPartialTemplates(contentHTML, templateData, (err, fullPageHTML) => {
      if (err || !fullPageHTML) return callback(500, '<p>Internal Server Error</p>', 'html')

      // Return the final html back to the requester
      callback(200, fullPageHTML, 'html')
    })
  })
}

// Create session handler
handlers.sessionCreate = (data, callback) => {
  if (data.method !== 'get') {
    return callback(405, undefined, 'html')
  }

  // Prepare data for interpolation
  const templateData = {
    'head.title': 'Login to your Account',
    'head.description': 'Please enter your phone number and password to access your account.',
    'body.class': 'sessionCreate',
  }

  // Read in a template as a string
  getTemplate('sessionCreate', templateData, (err, contentHTML) => {
    if (err || !contentHTML) {
      return callback(500, undefined, 'html')
    }
    // Add the universal header and footer
    addPartialTemplates(contentHTML, templateData, (err, fullPageHTML) => {
      if (err || !fullPageHTML) return callback(500, '<p>Internal Server Error</p>', 'html')

      // Return the final html back to the requester
      callback(200, fullPageHTML, 'html')
    })
  })
}

// Session has been deleted
handlers.sessionDeleted = (data, callback) => {
  if (data.method !== 'get') {
    return callback(405, undefined, 'html')
  }

  // Prepare data for interpolation
  const templateData = {
    'head.title': 'Logged out',
    'head.description': 'You have been logged out of your account.',
    'body.class': 'sessionDeleted',
  }

  // Read in a template as a string
  getTemplate('sessionDeleted', templateData, (err, contentHTML) => {
    if (err || !contentHTML) {
      return callback(500, undefined, 'html')
    }
    // Add the universal header and footer
    addPartialTemplates(contentHTML, templateData, (err, fullPageHTML) => {
      if (err || !fullPageHTML) return callback(500, '<p>Internal Server Error</p>', 'html')

      // Return the final html back to the requester
      callback(200, fullPageHTML, 'html')
    })
  })
}

// Favicon handler
handlers.favicon = (data, callback) => {
  if (data.method !== 'get') {
    return callback(405, undefined, 'html')
  }

  // Read in the favicon's data
  getStaticAsset('favicon.ico', (err, favicon) => {
    if (err || !favicon) {
      return callback(500, undefined, 'html')
    }

    callback(200, favicon, 'favicon')
  })
}

// Public Assets
handlers.public = (data, callback) => {
  if (data.method !== 'get') {
    return callback(405, undefined, 'html')
  }

  // Get the filename that is being requested
  const assetName = data.trimmedPath.replace('public/', '')
  if (assetName.length === 0) return callback(404, undefined, 'html')

  // Read in the favicon's data
  getStaticAsset(assetName, (err, assetData) => {
    if (err || !assetData) {
      return callback(404, undefined, 'html')
    }

    // Determin the asset content type via file extension
    let contentType // default
    switch (true) {
      case (assetName.includes('.css')):
        contentType = 'css'
        break

      case (assetName.includes('.png')):
        contentType = 'png'
        break

      case (assetName.includes('.jpg')):
          contentType = 'jpg'
        break

      case (assetName.includes('.ico')):
        contentType = 'favicon'
        break

      case (assetName.includes('.js')):
        contentType = 'js'
        break

      default:
        contentType = 'plain'
        break
    }

    callback(200, assetData, contentType)
  })
}

/////////////////////////////////////////////////////////////////////////////////

/*
 * JSON API handlers
 *
 */

 handlers.ping = (data, callback) => {
  // Callback a HTTP status code, and a payload object
  callback(200, { _status: 200 , _message: 'Server is up and running.' })
}

handlers.notFound = (data, callback) => {
  // Callback a HTTP status code, and a payload object
  callback(404, { _status: 404 , _error: 'Sorry, I have nothing for you to serve at this route.' })
}

/* Users */
handlers.users = (data, callback) => {
  if (typeof(_users[data.method]) === 'function') {
    _users[data.method](data, callback)
  } else {
    callback(405, { _status: 405 , _error: `Sorry, ${data.method} is not allowed for this route.` }) // HTTP code for method not allowed
  }
}

// Users submethods for each method type
const _users = {}

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
_users.post = (data, callback) => {
  let { firstName, lastName, phone, password, tosAgreement } = data.payload

  // Sanity checks for the required fields
  firstName = typeof (firstName) === 'string' && firstName.trim().length > 0 && firstName.trim()
  lastName = typeof (lastName) === 'string' && lastName.trim().length > 0 && lastName.trim()
  phone = typeof (phone) === 'string' && phone.trim().length == 10 && phone.trim()
  password = typeof (password) === 'string' && password.trim().length > 0 && password.trim()
  tosAgreement = typeof (tosAgreement) === 'boolean' && tosAgreement

  if (!firstName || !lastName || !password || !phone) {
    return callback(400, { _status: 400 , _error: 'Missing some required fields. Please check your data again.' })
  }

  if (!tosAgreement) {
    return callback(400, { _status: 400 , _error: 'You must agree to the terms of service.' })
  }

  // Make sure the given user doesn't already exist (unique phone)
  // We try to read the file named as the user's given phone number
  // If the file exists, no error is thrown and it means the user already exist
  // if no error is thrown, that means user does not exist and we can create a new user.
  dataLib.read('users', phone, (err, data) => {
    if (!err) {
      // User already exists
      return callback(400, { _status: 400 , _error: `A user with phone number ${phone} already exists.` })
    }

    // User not exists, let's create one
    // Hash the pw
    const hashedPassword = hash(password)
    if (!hashedPassword) {
      return callback(500, { _status: 500 , _error: 'Could not hash the user\'s password.' })
    }

    // Create user object
    const userObject = { firstName, lastName, hashedPassword, phone, tosAgreement }

    // Store the user
    dataLib.create('users', phone, userObject, err => {
      if (err) {
        console.log(err)
        return callback(500, { _status: 500 , _error: 'Could not create the new user.' })
      }

      return callback(200, { _status: 200 , _message: `User with phone ${phone} created successfully` })
    })
  })
}

// Users - get
// Required data: phone
// Optional data: none
_users.get = (data, callback) => {
  let { phone } = data.queryString

  // Check that the phone number provided is valid
  phone = typeof(phone) === 'string' && phone.trim().length === 10 && phone.trim()

  if (!phone) {
    return callback(400, { _status: 400 , _error: 'Missing/invalid required field. (phone)' })
  }

  // Get the token from the headers
  const tokenId = typeof(data.headers.token) === 'string' && data.headers.token

  // Verify token
  verifyToken(tokenId, phone, isValid => {
    if (!isValid) {
      return callback(401, { _status: 401 , _error: 'Token does not exist in header, or already expired.' })
    }

    // Lookup the user
    dataLib.read('users', phone, (err, userData) => {
      if (err && !userData) {
        return callback(404, { _status: 404 , _error: `User with phone number ${phone} does not exist.` })
      }

      // Remove the hashed password before returning it to the requester
      delete userData.hashedPassword
      return callback(200, { _status: 200, data: userData })
    })
  })
}

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
_users.put = (data, callback) => {
  let { phone, firstName, lastName, password } = data.payload

  // Check that the phone number provided is valid
  phone = typeof(phone) === 'string' && phone.trim().length === 10 && phone.trim()

  if (!phone) {
    return callback(400, { _status: 400 , _error: 'Missing/invalid required field. (phone)' })
  }

  // Check for the optional fields
  firstName = typeof (firstName) === 'string' && firstName.trim().length > 0 && firstName.trim()
  lastName = typeof (lastName) === 'string' && lastName.trim().length > 0 && lastName.trim()
  password = typeof (password) === 'string' && password.trim().length > 0 && password.trim()

  if (!firstName && !lastName && !password) {
    return callback(400, { _status: 400 , _error: 'Missing required field(s). You must supply some data to update.' })
  }

  // Get the token from the headers
  const tokenId = typeof(data.headers.token) === 'string' && data.headers.token

  // Verify token
  verifyToken(tokenId, phone, isValid => {
    if (!isValid) {
      return callback(401, { _status: 401 , _error: 'Token does not exist in header, or already expired.' })
    }

    // Lookup the user
    dataLib.read('users', phone, (err, userData) => {
      if (err && !userData) {
        return callback(404, { _status: 404 , _error: `User with phone number ${phone} does not exist.` })
      }

      // Update the necessary fields
      if (firstName) {
        userData.firstName = firstName
      }

      if (lastName) {
        userData.lastName = lastName
      }

      if (password) {
        userData.hashedPassword = hash(password)
      }

      // Store the new updates to file
      dataLib.update('users', phone, userData, err => {
        if (err) {
          console.log(err)
          return callback(500, { _status: 500 , _error: 'Could not update the user.' })
        }

        return callback(200, { _status: 200 , _message: 'User successfully updated.' })
      })
    })
  })
}

// Users - delete
// Required data: phone
// Optional data: none
_users.delete = (data, callback) => {
  let { phone } = data.queryString

  // Check that the phone number provided is valid
  phone = typeof(phone) === 'string' && phone.trim().length === 10 && phone.trim()

  if (!phone) {
    return callback(400, { _status: 400 , _error: 'Missing/invalid required field. (phone)' })
  }

  // Get the token from the headers
  const tokenId = typeof(data.headers.token) === 'string' && data.headers.token

  // Verify token
  verifyToken(tokenId, phone, isValid => {
    if (!isValid) {
      return callback(401, { _status: 401 , _error: 'Token does not exist in header, or already expired.' })
    }

    // Lookup the user
    dataLib.read('users', phone, (err, userData) => {
      if (err && !userData) {
        return callback(404, { _status: 404 , _error: `User with phone number ${phone} does not exist.` })
      }

      // Remove the hashed password before returning it to the requester
      dataLib.delete('users', phone, err => {
        if (err) {
          return callback(500, { _status: 500 , _error: 'Could not delete the specified user.' })
        }

        // Delete each of the check associated with the user
        const userChecks = userData.checks

        // If there are no checks
        if (!userChecks || (isArray(userChecks) && !hasLength(userChecks))) {
          callback(200, { _status: 200 , _message: 'User successfully deleted.' })
        }

        const totalChecksToDelete = userChecks.length
        let checksDeleted = 0;
        let delettionErrors = false

        // Loop through checks
        userChecks.forEach(checkId => {
          // Delete the check
          dataLib.delete('checks', checkId, err => {
            if (err) {
              delettionErrors = true
            }
            checksDeleted++
            if (checksDeleted === totalChecksToDelete) {
              if (!delettionErrors) {
                return callback(200, { _status: 200 , _message: 'User successfully deleted.' })
              }

              // Some error occured while deleting
              return callback(200, { _status: 200 , _error: 'Errors encountered while attempting to delete all of the user\'s checks. All checks may not have been deleted from the system successfully.' })
            }
          })
        })

      })
    })
  })
}

/* Tokens */
handlers.tokens = (data, callback) => {
  if (typeof(_tokens[data.method]) === 'function') {
    _tokens[data.method](data, callback)
  } else {
    callback(405, { _status: 405 , _error: `Sorry, ${data.method} is not allowed for this route.` }) // HTTP code for method not allowed
  }
}

// Tokens submethods for each method type
const _tokens = {}

// Tokens - post
// Required data: phone, password
// Optional data: none
_tokens.post = (data, callback) => {
  let { phone, password } = data.payload

  // Sanity checks
  phone = typeof (phone) === 'string' && phone.trim().length == 10 && phone.trim()
  password = typeof (password) === 'string' && password.trim().length > 0 && password.trim()

  if (!phone || !password) {
    return callback(400, { _status: 400 , _error: 'Missing some required fields. Please check your data again.' })
  }

  // Lookup the user who matches that phone number
  dataLib.read('users', phone, (err, userData) => {
    if (err && !userData) {
      return callback(404, { _status: 404 , _error: 'Could not find the specified user.' })
    }

    // User exists, now match the password hash
    if (hash(password) !== userData.hashedPassword) {
      // password invalid
      return callback(400, { _status: 400 , _error: 'Invalid password.' })
    }

    // User is matched, create a token with a random value. Set expiration date 1 hour in future
    const tokenId = createRandomString(20);
    const tokenExpiry = Date.now() + 60 * 60 * 100099999 // 1 hour
    const tokenObject = { phone, id: tokenId, expires: tokenExpiry }

    // Store the token
    dataLib.create('tokens', tokenId, tokenObject, err => {
      if (err) {
        return callback(500, { _status: 500, _error: 'Error creating token. Please try again in a moment.' })
      }

      return callback(200, { _status: 200, data: tokenObject })
    })
  })

}

// Tokens - get
// Required data: id
// Optional data: none
_tokens.get = (data, callback) => {
  let { id } = data.queryString

  // Check that the id number provided is valid
  id = typeof(id) === 'string' && id.trim().length === 20 && id.trim()

  if (!id) {
    return callback(400, { _status: 400 , _error: 'Missing/invalid required field. (id)' })
  }

  // Lookup the token
  dataLib.read('tokens', id, (err, tokenData) => {
    if (err && !tokenData) {
      return callback(404, { _status: 404 , _error: `Token with the id ${id} does not exist.` })
    }

    // Remove the hashed password before returning it to the requester
    return callback(200, { _status: 200, data: tokenData })
  })
}

// Tokens - put
// Required data: id, extend
// Optional data: none
_tokens.put = (data, callback) => {
  let { id, extend } = data.payload

  // Check that the id number provided is valid
  id = typeof(id) === 'string' && id.trim().length === 20 && id.trim()
  extend = typeof(extend) === 'boolean' && extend

  if (!id || !extend) {
    return callback(400, { _status: 400 , _error: 'Missing/invalid required field.' })
  }

  // Lookup the token
  dataLib.read('tokens', id, (err, tokenData) => {
    if (err && !tokenData) {
      return callback(404, { _status: 404 , _error: `Token with id ${id} does not exist.` })
    }

    // Check to make sure the token isn't already expired
    if (tokenData.expires < Date.now()) {
      return callback(404, { _status: 404 , _error: `Token is already expired.` })
    }

    // Extend the expiration from an hour from now
    tokenData.expires = Date.now() + 60 * 60 * 100099999

    // Store the new updates
    dataLib.update('tokens', id, tokenData, err => {
      if (err) {
        console.log(err)
        return callback(500, { _status: 500 , _error: 'Could not update the token. Please try again in a moment.' })
      }

      return callback(200, { _status: 200 , _message: 'Token successfully updated.', data: tokenData})
    })
  })
}

// Tokens - delete
// Required data: id
// Optional data: none
_tokens.delete = (data, callback) => {
  let { id } = data.queryString

  // Check that the id provided is valid
  id = typeof(id) === 'string' && id.trim().length === 20 && id.trim()

  if (!id) {
    return callback(400, { _status: 400 , _error: 'Missing/invalid required field. (id)' })
  }

  // Lookup the token
  dataLib.read('tokens', id, (err, tokenData) => {
    if (err && !tokenData) {
      return callback(404, { _status: 404 , _error: `Token with the id ${id} does not exist.` })
    }

    dataLib.delete('tokens', id, err => {
      if (err) {
        return callback(500, { _status: 500 , _error: 'Could not delete the specified token.' })
      }

      callback(200, { _status: 200 , _message: 'Token successfully deleted.' })
    })
  })
}

// Verify if a given token id is currently valid for a given user
const verifyToken = (id, phone, callback) => {
  // Lookup the token
  dataLib.read('tokens', id, (err, tokenData) => {
    if (err || (tokenData && phone !== tokenData.phone)) {
      return callback(false)
    }

    // Token expired
    if (Date.now() > tokenData.expires) {
      return callback(false)
    }

    // All set
    return callback(true, tokenData)
  })
}

// Get the user data from the token id
const getUserAuth = (tokenId, callback) => {
  // Lookup the token
  dataLib.read('tokens', tokenId, (err, tokenData) => {
    if ((err && !tokenData) || Date.now() > tokenData.expires) {
      return callback(false)
    }

    // Lookup the user
    const userPhone = tokenData.phone

    dataLib.read('users', userPhone, (err, userData) => {
      if (err && !userData) {
        return callback(false)
      }

      // Token exists and is valid, and user also exists
      callback({ user: userData, token: tokenData })
    })
  })
}

// Verify user token from the headers

/* Checks */
handlers.checks = (data, callback) => {
  if (typeof(_tokens[data.method]) === 'function') {
    _checks[data.method](data, callback)
  } else {
    callback(405, { _status: 405 , _error: `Sorry, ${data.method} is not allowed for this route.` }) // HTTP code for method not allowed
  }
}

// Checks submethods for each method type
const _checks = {}

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none
_checks.post = (data, callback) => {
  let { protocol, url, method, successCodes, timeoutSeconds } = data.payload
  const { token } = data.headers

  // Lookup the user
  getUserAuth(token, authData => {
    if (!authData) {
      return  callback(401, { _status: 401 , _error: 'Auth token is invalid/expired. Please login again.' })
    }

    const userData = authData.user

    // Payload normalization
    protocol = lowerCase(protocol)
    url = lowerCase(url)
    method = lowerCase(method)
    successCodes = lowerCase(successCodes) // `lowerCase` works for Arrays too

    // Sanity checks
    protocol = isString(protocol) && ['http', 'https'].includes(protocol) && protocol
    url = isString(url) && url.trim().length > 0 && url.trim()
    method = isString(method) && ['post', 'get', 'put', 'delete'].includes(method) && method
    successCodes = isArray(successCodes) && arrayOf('integers', successCodes) && hasLength(successCodes) && successCodes
    timeoutSeconds = isInteger(timeoutSeconds) && inRange(timeoutSeconds, 1, 5) && timeoutSeconds

    if (!protocol || !url || !method || !successCodes || !timeoutSeconds) {
      return callback(400, { _status: 400 , _error: 'Some required fields are missing or invalid.' })
    }

    // Which checks the user already have
    const userChecks = isArray(userData.checks) ? userData.checks : []

    // Verify the user has max checks per user
    if (userChecks.length >= maxChecks) {
      return callback(403, { _status: 403 , _error: `Checks limit exceeded. Only ${maxChecks} are allowed per user.` })
    }

    // Create a random ID for the check
    const checkId = createRandomString(20)

    // Create the check object with user's phone
    const checkObject = {
      id: checkId,
      userPhone: userData.phone,
      protocol,
      url,
      method,
      successCodes,
      timeoutSeconds,
    }

    // Create the new check
    dataLib.create('checks', checkId, checkObject, err => {
      if (err) {
        return callback(500, { _status: 500 , _error: 'Error creating check. Please try again in a moment.' })
      }

      // Add the checkId to user's object
      userData.checks = userChecks
      userData.checks.push(checkId)

      // Save the new user data
      dataLib.update('users', userData.phone, userData, err => {
        if (err) {
          // remove the recently created check
          dataLib.delete('checks', checkId)
          return callback(500, { _status: 500 , _error: 'Error update the user with the new check. Please try again in a moment.' })
        }

        // Return the data about the new check to the requester
        callback(200, { _status: 200, data: checkObject })
      })
    })
  })
}

// Checks - get
// Required data:
// Optional data: none
_checks.get = (data, callback) => {
  // Check the auth token first
  getUserAuth(data.headers.token, authData => {
    if (!authData) {
      return  callback(401, { _status: 401 , _error: 'Auth token is invalid/expired. Please login again.' })
    }

    // Sanity checks
    let { id } = data.queryString

    // Check that the phone number provided is valid
    id = isString(id) && id.trim().length === 20 && id.trim()

    if (!id) {
      return callback(400, { _status: 400 , _error: 'Missing/invalid required field. (id)' })
    }

    // Lookup the check
    const userData = authData.user

    dataLib.read('checks', id, (err, checkData) => {
      if (err && !checkData) {
        return callback(404, { _status: 404 , _error: `Check with the id ${id} does not exist.` })
      }

      if (userData.phone !== checkData.userPhone) {
        return callback(401, { _status: 401 , _error: 'You\'re not authorized to access this token.' })
      }

      return callback(200, { _status: 200, data: checkData })
    })
  })
}

// Checks - put
// Required data: id and at least one from the optional data
// Optional data: protocol, url, method, successCodes, timeoutSeconds
_checks.put = (data, callback) => {
  let { id: checkId, protocol, url, method, successCodes, timeoutSeconds } = data.payload
  const { token } = data.headers

  // Lookup the user
  getUserAuth(token, authData => {
    if (!authData) {
      return  callback(401, { _status: 401 , _error: 'Auth token is invalid/expired. Please login again.' })
    }

    const userData = authData.user

    // Payload normalization
    protocol = lowerCase(protocol)
    url = lowerCase(url)
    method = lowerCase(method)
    successCodes = lowerCase(successCodes) // `lowerCase` works for Arrays too

    // Sanity checks
    protocol = isString(protocol) && ['http', 'https'].includes(protocol) && protocol
    url = isString(url) && url.trim().length > 0 && url.trim()
    method = isString(method) && ['post', 'get', 'put', 'delete'].includes(method) && method
    successCodes = isArray(successCodes) && arrayOf('integers', successCodes) && hasLength(successCodes) && successCodes
    timeoutSeconds = isInteger(timeoutSeconds) && inRange(timeoutSeconds, 1, 5) && timeoutSeconds

    if (!protocol && !url && !method && !successCodes && !timeoutSeconds) {
      return callback(400, { _status: 400 , _error: 'You must specify at least one field that needs to be modified. (protocol, url, method, successCodes, timeoutSeconds)' })
    }

    // Make sure if the check exist
    dataLib.read('checks', checkId, (err, checkData) => {
      if (err) {
        return callback(404, { _status: 404 , _error: `There is no check with the id ${checkId}` })
      }

      // Update the check object
      protocol && (checkData.protocol = protocol)
      url && (checkData.url = url)
      method && (checkData.method = method)
      successCodes && (checkData.successCodes = successCodes)
      timeoutSeconds && (checkData.timeoutSeconds = timeoutSeconds)

      // Save the updated value to the check
      dataLib.update('checks', checkId, checkData, err => {
        if (err) {
          return callback(500, { _status: 500 , _error: 'Error creating check. Please try again in a moment.' })
        }

        return callback(200, { _status: 200 , data: checkData })
      })
    })

  })
}

// Checks - delete
// Required data:
// Optional data: none
_checks.delete = (data, callback) => {
  // Check the auth token first
  getUserAuth(data.headers.token, authData => {
    if (!authData) {
      return  callback(401, { _status: 401 , _error: 'Auth token is invalid/expired. Please login again.' })
    }

    // Sanity checks
    let { id } = data.queryString

    // Check that the phone number provided is valid
    id = isString(id) && id.trim().length === 20 && id.trim()

    if (!id) {
      return callback(400, { _status: 400 , _error: 'Missing/invalid required field. (id)' })
    }

    // Lookup the check
    const userData = authData.user

    dataLib.read('checks', id, (err, checkData) => {
      if (err && !checkData) {
        return callback(404, { _status: 404 , _error: `Check with the id ${id} does not exist.` })
      }

      if (userData.phone !== checkData.userPhone) {
        return callback(401, { _status: 401 , _error: 'You\'re not authorized to delete this token.' })
      }

      // Delete the check
      dataLib.delete('checks', id, err => {
        if (err) {
          return callback(500, { _status: 500, _error: 'Error deleting check. Please try again.' })
        }

        // Update the user object
        userData.checks = userData.checks.filter(chkId => chkId !== id)
        dataLib.update('users', userData.phone, userData, err => {
          if (err) {
            return callback(500, { _status: 500, _error: 'Could not update the user with the new data.' })
          }

          // Successfully deleted the check
          return callback(200, { _status: 200, _message: `Successfully delete the check with the id ${id}` })
        })
      })
    })
  })
}

module.exports = handlers
