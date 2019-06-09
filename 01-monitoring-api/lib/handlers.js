/*
 * Router Request Handlers
 *
 */

 const dataLib = require('./data')
 const helpers = require('./helpers')

 /////////////////////////////////////////////////////////////////////////////////

const handlers = {}

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
    const hashedPassword = helpers.hash(password)
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
        userData.hashedPassword = helpers.hash(password)
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
    dataLib.read('users', phone, (err, data) => {
      if (err && !data) {
        return callback(404, { _status: 404 , _error: `User with phone number ${phone} does not exist.` })
      }

      // Remove the hashed password before returning it to the requester
      dataLib.delete('users', phone, err => {
        if (err) {
          return callback(500, { _status: 500 , _error: 'Could not delete the specified user.' })
        }

        callback(200, { _status: 500 , _message: 'User successfully deleted.' })
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
    if (helpers.hash(password) !== userData.hashedPassword) {
      // password invalid
      return callback(400, { _status: 400 , _error: 'Invalid password.' })
    }

    // User is matched, create a token with a random value. Set expiration date 1 hour in future
    const tokenId = helpers.createRandomString(20);
    const tokenExpiry = Date.now() + 60 * 60 * 1000 // 1 hour
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

  // Check that the phone number provided is valid
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

  // Check that the phone number provided is valid
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
    tokenData.expires = Date.now() + 60 * 60 * 1000

    // Store the new updates
    dataLib.update('tokens', id, tokenData, err => {
      if (err) {
        console.log(err)
        return callback(500, { _status: 500 , _error: 'Could not update the token. Please try again in a moment.' })
      }

      return callback(200, { _status: 200 , _message: 'Token successfully updated.' })
    })
  })
}

// Tokens - delete
// Required data: phone
// Optional data: none
_tokens.delete = (data, callback) => {
  let { id } = data.queryString

  // Check that the phone number provided is valid
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
    dataLib.delete('tokens', id, err => {
      if (err) {
        return callback(500, { _status: 500 , _error: 'Could not delete the specified token.' })
      }

      callback(200, { _status: 500 , _message: 'Token successfully deleted.' })
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
    return callback(true)
  })
}

module.exports = handlers
