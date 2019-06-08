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
  callback(200, { status: 200 , message: 'Server is up and running. '})
}

handlers.notFound = (data, callback) => {
  // Callback a HTTP status code, and a payload object
  callback(404, { status: 404 , error: 'Sorry, I have nothing for you to serve at this route.'})
}

// Users
handlers.users = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete']
  if (acceptableMethods.includes(data.method)) {
    _users[data.method](data, callback)
  } else {
    callback(405, { status: 405 , error: `Sorry, ${data.method} is not allowed for this route.`}) // HTTP code for method not allowed
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
    return callback(400, { status: 400 , error: 'Missing some required fields. Please check your data again.'})
  }

  if (!tosAgreement) {
    return callback(400, { status: 400 , error: 'You must agree to the terms of service.'})
  }

  // Make sure the given user doesn't already exist (unique phone)
  // We try to read the file named as the user's given phone number
  // If the file exists, no error is thrown and it means the user already exist
  // if no error is thrown, that means user does not exist and we can create a new user.
  dataLib.read('users', phone, (err, data) => {
    if (!err) {
      // User already exists
      return callback(400, { status: 400 , error: `A user with phone number ${phone} already exists.`})
    }

    // User not exists, let's create one
    // Hash the pw
    const hashedPassword = helpers.hash(password)
    if (!hashedPassword) {
      return callback(500, { status: 500 , error: 'Could not hash the user\'s password.'})
    }

    // Create user object
    const userObject = { firstName, lastName, hashedPassword, phone, tosAgreement }

    // Store the user
    dataLib.create('users', phone, userObject, err => {
      if (err) {
        console.log(err)
        return callback(500, { status: 500 , error: 'Could not create the new user.'})
      }

      return callback(200, { status: 200 , message: `User with phone ${phone} created successfully`})
    })
  })
}

// Users - get
// Required data: phone
// Optional data: none
// @TODO: Only let an authed user access their access. Don't let them access anyone else's
_users.get = (data, callback) => {
  let { phone } = data.queryString

  // Check that the phone number provided is valid
  phone = typeof(phone) === 'string' && phone.trim().length === 10 && phone.trim()

  if (!phone) {
    return callback(400, { status: 400 , error: 'Missing/invalid required field. (phone)'})
  }

  // Lookup the user
  dataLib.read('users', phone, (err, data) => {
    if (err && !data) {
      return callback(404, { status: 404 , error: `User with phone number ${phone} does not exist.`})
    }

    // Remove the hashed password before returning it to the requester
    delete data.hashedPassword
    return callback(200, data)
  })
}

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
// @TODO: Only let an authed user update their own data. Don't let them update anyone else's
_users.put = (data, callback) => {
  let { phone, firstName, lastName, password } = data.payload

  // Check that the phone number provided is valid
  phone = typeof(phone) === 'string' && phone.trim().length === 10 && phone.trim()

  if (!phone) {
    return callback(400, { status: 400 , error: 'Missing/invalid required field. (phone)'})
  }

  // Check for the optional fields
  firstName = typeof (firstName) === 'string' && firstName.trim().length > 0 && firstName.trim()
  lastName = typeof (lastName) === 'string' && lastName.trim().length > 0 && lastName.trim()
  password = typeof (password) === 'string' && password.trim().length > 0 && password.trim()

  if (!firstName && !lastName && !password) {
    return callback(400, { status: 400 , error: 'Missing required field(s). You must supply some data to update.'})
  }

  // Lookup the user
  dataLib.read('users', phone, (err, userData) => {
    if (err && !userData) {
      return callback(404, { status: 404 , error: `User with phone number ${phone} does not exist.`})
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
        return callback(500, { status: 500 , error: 'Could not update the user.'})
      }

      return callback(200, { status: 200 , message: 'User successfully updated.'})
    })
  })

}

// Users - delete
// Required data: phone
// Optional data: none
// @TODO: Only let an authed user delete their own data. Don't let them delete anyone else's
// @TODO: Cleanup any other data files associated with this user
_users.delete = (data, callback) => {
  let { phone } = data.queryString

  // Check that the phone number provided is valid
  phone = typeof(phone) === 'string' && phone.trim().length === 10 && phone.trim()

  if (!phone) {
    return callback(400, { status: 400 , error: 'Missing/invalid required field. (phone)'})
  }

  // Lookup the user
  dataLib.read('users', phone, (err, data) => {
    if (err && !data) {
      return callback(404, { status: 404 , error: `User with phone number ${phone} does not exist.`})
    }

    // Remove the hashed password before returning it to the requester
    dataLib.delete('users', phone, (err, data) => {
      if (err && !data) {
        return callback(500, { status: 500 , error: 'Could not delete the specified user.'})
      }

      callback(200, { status: 500 , message: 'User successfully deleted.'})
    })
  })
}

module.exports = handlers
