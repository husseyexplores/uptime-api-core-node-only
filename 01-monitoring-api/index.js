const server = require('./lib/server')
const workers = require('./lib/workers')
const cli = require('./lib/cli')

const app = {}
app.init = () => {
  // Start the server
  server.init()

  // Start the workers
  workers.init()

  // Start the CLI, but make sure it starts last
  setTimeout(() => {
    cli.init()
  }, 1000 * 1);
},

// Start the app
app.init()

module.exports = app
