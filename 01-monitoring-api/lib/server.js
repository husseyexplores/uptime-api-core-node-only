const http = require('http')
const https = require('https')
const url = require('url')
const fs = require('fs')
const path = require('path')
const { StringDecoder } = require('string_decoder')

const config = require('../config')
const handlers = require('./handlers')
const { safeJSONparse } = require('./helpers')

/////////////////////////////////////////////////////////////////////////////////

const server  = {}

// Router
server.router = {
  ping: handlers.ping,
  notFound: handlers.notFound,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks,
}

server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, '../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../https/cert.pem')),
}

// Request handlers for HTTP and HTTPS servers
server.requestHandler = (req, res) => {
  // Parse the URL
  const parsedURL = url.parse(req.url, true)

  // Get the request path of URL
  const path = parsedURL.pathname
  // remove all leading and trailing slashes
  const trimmedPath = path.replace(/^\/+|\/+$/g, '') || '/'

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
    // Or can also return HTTP 413 Error Code (Request Entity Too Large)
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
    const handler = (typeof(router[trimmedPath] === 'function') && router[trimmedPath]) || router.notFound
    handler(data, (statusCode, payload) => {
      // **This is a payload that is sent to the user**
      // sane defaults
      statusCode = typeof(statusCode) === 'number' ? statusCode : 200
      payload = typeof(payload) === 'object' ? payload : {}

      // convert payload to string
      const payloadString = JSON.stringify(payload)

      // return the response
      res.setHeader('Content-Type', 'application/json')
      res.writeHead(statusCode)
      res.end(payloadString)

      if (trimmedPath === 'favicon.ico') return

      // Log the request path
      console.log(`Request is received on path \`${trimmedPath}\` with this method: \`${method}\``)
    })
  })
}

server.httpServer = http.createServer(server.requestHandler)
server.httpsServer = https.createServer(server.httpsServerOptions, server.requestHandler)

server.init = () => {
  // Start the HTTP Server
  server.httpServer.listen(config.httpPort, () => {
    console.log(`*HTTP Server started at port ${config.httpPort} in ${config.envName} environment.*`)
  })

  // Start the HTTPS Server
  server.httpsServer.listen(config.httpsPort, () => {
    console.log(`*HTTPS Server started at port ${config.httpsPort} in ${config.envName} environment.*`)
  })
}

module.exports = server
