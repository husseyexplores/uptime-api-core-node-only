const http = require('http')
const https = require('https')
const url = require('url')
const fs = require('fs')
const path = require('path')
const util = require('util')
const { StringDecoder } = require('string_decoder')

const config = require('../config')
const handlers = require('./handlers')
const { safeJSONparse, isString, isObject } = require('./helpers')

const debug = util.debuglog('server')

/////////////////////////////////////////////////////////////////////////////////

const server  = {}

// Router
server.router = {
  ping: handlers.ping,
  '': handlers.index,
  'account/create': handlers.accountCreate,
  'account/edit': handlers.accountCreate,
  'account/deleted': handlers.accountDeleted,
  'session/create': handlers.sessionCreate,
  'session/deleted': handlers.sessionDeleted,
  'checks/all': handlers.checksList,
  'checks/create': handlers.checksCreate,
  'checks/edit': handlers.checksEdit,
  notFound: handlers.notFound,
  'api/users': handlers.users,
  'api/tokens': handlers.tokens,
  'api/checks': handlers.checks,
  'favicon.ico': handlers.favicon,
  'public': handlers.public,
}

server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, '../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../https/cert.pem')),
}

server.requestHandler = (req, res) => {
  // Parse the URL
  const parsedURL = url.parse(req.url, true)

  // Get the request path of URL
  const path = parsedURL.pathname
  // remove all leading and trailing slashes
  const trimmedPath = path.replace(/^\/+|\/+$/g, '')

  // Get the query string as an object
  const queryString = parsedURL.query

  // Get the HTTP method
  const method = req.method.toLowerCase()

  // Get the headers
  const { headers } = req

  // Get the payload, if any
  const decoder = new StringDecoder('utf-8')
  let buffer = ''
  req.on('data', chunk => {
    buffer += decoder.write(chunk)

    // Too much POST data, kill the connection!
    // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
    if (buffer.length > 1e6) {
      res.writeHead(413)
      req.connection.destroy()
    }
  })

  req.on('end', () => {
    buffer += decoder.end()

    // construct the data object to send to the handler
    const data = {
      trimmedPath,
      queryString,
      method,
      headers,
      payload: safeJSONparse(buffer),
    }

    // Delegate the data to the respective handler
    const { router } = server
    let handler;

    // If the request is within public directory, use the public handler instead
    if (trimmedPath.startsWith('public/')) {
      handler = router.public
    } else {
      handler = (typeof(router[trimmedPath] === 'function') && router[trimmedPath]) || router.notFound
    }

    handler(data, (statusCode, payload, contentType) => {
      // **This is a payload that is sent to the user**
      // sane defaults
      statusCode = typeof(statusCode) === 'number' ? statusCode : 200
      contentType = contentType || 'json'

      // set the response-parts that are content-specific
      switch (contentType) {
        case 'json':
          payload = JSON.stringify(isObject(payload) ? payload : {})
          res.setHeader('Content-Type', 'application/json')
          break

        case 'html':
          res.setHeader('Content-Type', 'text/html')
          break

        case 'favicon':
          res.setHeader('Content-Type', 'image/x-icon')
          break

        case 'css':
          res.setHeader('Content-Type', 'text/css')
          break

        case 'js':
          res.setHeader('Content-Type', 'text/javascript')
          break

        case 'png':
          res.setHeader('Content-Type', 'image/png')
          break

        case 'jpg':
          res.setHeader('Content-Type', 'image/jpeg')
          break

        default:
          payload = isString(payload) ? payload : ''
          res.setHeader('Content-Type', 'text/plain')
      }

      // set the response-parts that are common to all content types
      res.writeHead(statusCode)
      res.end(payload)

      // if (trimmedPath === 'favicon.ico') return

      // If the response is 200, print in green, otherwise print red
      if (statusCode === 200) {
        debug('\x1b[32m%s\x1b[0m', `${method.toUpperCase()} | ${trimmedPath} | ${statusCode}`) // green
      } else {
        debug('\x1b[31m%s\x1b[0m', `${method.toUpperCase()} | ${trimmedPath} | ${statusCode}`) // red
      }
    })
  })
}

server.httpServer = http.createServer(server.requestHandler)
server.httpsServer = https.createServer(server.httpsServerOptions, server.requestHandler)

server.init = () => {
  // Start the HTTP Server
  server.httpServer.listen(config.httpPort, () => {
    console.log('\x1b[36m%s\x1b[0m', `*HTTP Server started at port ${config.httpPort} in ${config.envName} environment.*`)
  })

  // Start the HTTPS Server
  server.httpsServer.listen(config.httpsPort, () => {
    console.log('\x1b[35m%s\x1b[0m', `*HTTPS Server started at port ${config.httpsPort} in ${config.envName} environment.*`)
  })
}

module.exports = server
