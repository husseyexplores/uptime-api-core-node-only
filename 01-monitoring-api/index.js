const server = require('./lib/server')
// const workers = require('./lib/workers')

const app = {
  init() {
    // Start the server
    server.init()

    // Start the workers
    // workers.init()
  },
}

// Start the app
app.init()

module.exports = app