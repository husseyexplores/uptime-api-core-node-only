/*
 * API Tests
 *
 */

const assert = require('assert')
const http = require('http')
const config = require('../config')
const app = require('../index')

/////////////////////////////////////////////////////////////////////////////////

const api = {}

// Helpers
const helpers = {}
helpers.makeGetRequest = (path = '/ping', callback = () => {}) => {
  // Configure the request details
  const reqDetails = {
    protocol: 'http:',
    hostname: 'localhost',
    port: config.httpPort,
    method: 'GET',
    path,
    headers: {
      'Content-Type': 'application/json',
    }
  }

  // Send the request
  const req = http.request(reqDetails, callback)
  req.end()
}

// The main init function should be able to run without throwing
api['app.init should start without throwing'] = done => {
  assert.doesNotThrow(() => {
    app.init(err => {
      done()
    })
  }, TypeError)
}

api['/ping should respond to GET with 200'] = done => {
  helpers.makeGetRequest('/ping', res => {
    assert.equal(res.statusCode, 200)
    done()
  })
}


api['/api/users should respond with 400 without any data and auth'] = done => {
  helpers.makeGetRequest('/api/users', res => {
    assert.equal(res.statusCode, 400)
    done()
  })
}


api['A random path should respond with 404'] = done => {
  helpers.makeGetRequest('/some/fake/path', res => {
    assert.equal(res.statusCode, 404)
    done()
  })
}

module.exports = api