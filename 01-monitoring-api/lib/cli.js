/*
 * CLI-related tasks
 *
 */

const events = require('events')
const readline = require('readline')
const util = require('util')

const debug = util.debuglog('cli')

/////////////////////////////////////////////////////////////////////////////////

class EventEmiiter extends events {}
const e = new EventEmiiter()

const cli = {}

// Responders
cli.responders = {}

// Bind all the valid query events
cli.bindValidQueryListeners = () => {
  // Input handlers
  e.on('man', cli.responders.help)
  e.on('help', cli.responders.help)
  e.on('exit', cli.responders.exit)
  e.on('stats', cli.responders.stats)
  e.on('list users', cli.responders.listUsers)
  e.on('more user info', cli.responders.userDetails)
  e.on('list checks', cli.responders.listChecks)
  e.on('more check info', cli.responders.checkDetails)
  e.on('list logs', cli.responders.listLogs)
  e.on('more log info', cli.responders.logDetails)
}

// help / man
cli.responders.help = () => {
  console.log('You asked for help!')
}

// exit
cli.responders.exit = () => {
  console.log('You asked for exit!')
}

// stats
cli.responders.stats = () => {
  console.log('You asked for stats!')
}

// list users
cli.responders.listUsers = () => {
  console.log('You asked for list users!')
}

// user details
cli.responders.userDetails = () => {
  console.log('You asked for user info!')
}

// list checks
cli.responders.listChecks = () => {
  console.log('You asked for list checks!')
}

// check details
cli.responders.checkDetails = () => {
  console.log('You asked for check info!')
}

// list logs
cli.responders.listLogs = () => {
  console.log('You asked for list logs!')
}

// log details
cli.responders.logDetails = () => {
  console.log('You asked for log info!')
}

// Input processor
cli.processInput = input => {
  input = typeof input === 'string' && input.trim().length > 0 && input.trim()

  // Only process something if the input is valid
  if (!input) return
  const lowerCasedInput = input

  // Valid queries that are allowed
  const validInputs = [
    'man',
    'help',
    'exit',
    'stats',
    'list users',
    'more user info',
    'list checks',
    'more check info',
    'list logs',
    'more log info',
  ]

  // Go through the possible inputs, emit an event when a match is found
  let matchFound = false
  let counter = 0
  validInputs.some(validInput => {
    if (lowerCasedInput.indexOf(validInput) !== -1) {
      matchFound = true
      // Emit an event matching the valid input, and include the given user input
      e.emit(validInput, input)
      return true
    }
  })

  // If no match is found, tell the user to try again
  if (!matchFound) {
    console.log(`Sorry, cmd not found. Please try again or type 'help' to see help`)
  }
}

cli.init = () => {
  console.log('\x1b[34m%s\x1b[0m', `*CLI has been started.*`)
  cli.bindValidQueryListeners()

  // Start the interface
  const interface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
  })

  // Create an initial prompt
  interface.prompt()

  // Handle each line of input separately
  interface.on('line', str => {
    // Send to the input processor
    cli.processInput(str)

    // Reinitialize the prompt
    interface.prompt()
  })

  // If the user stops the CLI, kill the associated process
  interface.on('close', () => {
    process.exit(0)
  })
}

module.exports = cli