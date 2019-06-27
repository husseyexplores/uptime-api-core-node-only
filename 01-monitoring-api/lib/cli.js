/*
 * CLI-related tasks
 *
 */

const events = require('events')
const readline = require('readline')
const util = require('util')
const os = require('os')
const v8 = require('v8')

const dataLib = require('./data')
const logsLib = require('./logs')
const { verticalSpace, horizontalLine, centered, percent, formatTime } = require('./helpers')

const debug = util.debuglog('cli')

/////////////////////////////////////////////////////////////////////////////////

class EventEmiiter extends events {}
const e = new EventEmiiter()

/*
 * Reference: https://ourcodeworld.com/articles/read/112/how-to-pretty-print-beautify-a-json-string
*/
const jsonHightlight = json => {
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

const yellow = str => `\x1b[33m${str}\x1b[0m`

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
  const commands = {
    exit: 'Kill the CLI (and the rest of the application)',
    man: 'Show this help page',
    help: 'Alias of the "man" command',
    stats: 'Get statistics of the underlying operating system and resource utilization',
    'list users': 'Show a list of all the registered (undeleted) users in the app',
    'more user info --{userId}': 'Show details of a specific user',
    'list checks --up --down': 'Show a list of all the active checks in the app, including their state. The "--up" and "--down" flags are both optional. ',
    'more check info --{checkId}': 'Show details of a specific check',
    'list logs': 'Show a list of all the log files available to be read (compressed only)',
    'more log info --{logFileName}': 'Show details of a specific log file',
  }

  // Show a header for the 'man' page that is as wide as the screen
  horizontalLine()
  centered('CLI MANUAL')
  horizontalLine()
  verticalSpace(2)

  // Show each command, followed by its explanation, in white and yellow respectively
  for (const key in commands) {
    if (!commands.hasOwnProperty(key)) continue
    const value = commands[key]
    let line = `\x1b[33m${key}\x1b[0m`
    const padding = 40 - line.length
    for (let i = 0; i < padding; i++) {
      line += ' '
    }
    line += value
    console.log(line)
    verticalSpace()
  }

  verticalSpace()
  horizontalLine()
}

// exit
cli.responders.exit = () => {
  process.exit(0)
}

// stats
cli.responders.stats = () => {
  // Compile and object of stats
  const freeMemoryInBytes = os.freemem()
  const freeMemoryInMBs = (freeMemoryInBytes / 1e+6).toFixed(2)
  const freeMemoryInGBs = (freeMemoryInBytes / 1e+9).toFixed(2)
  const totalMemoryInBytes = os.totalmem()
  const totalMemoryInMBs = (totalMemoryInBytes / 1e+6).toFixed(2)
  const totalMemoryInGBs = (totalMemoryInBytes / 1e+9).toFixed(2)
  const heapStats = v8.getHeapStatistics()

  const stats = {
    'Load Average': os.loadavg().join(' '),
    'CPU Count': os.cpus().length,
    'Total Memory': `${totalMemoryInMBs} Megabytes / ${totalMemoryInGBs} Gigabytes`,
    'Free Memory': `${freeMemoryInMBs} Megabytes / ${freeMemoryInGBs} Gigabytes`,
    'Current Malloced Memory': heapStats.malloced_memory,
    'Peak Malloced Memory': heapStats.peak_malloced_memory,
    'Active Native Contexts': heapStats.number_of_native_contexts + ' (Increase of this over time indicates a memory leak. See NodeJS v8 docs for more.)',
    'Detached Contexts': heapStats.number_of_detached_contexts + ' (This number being non-zero indicates a potential memory leak. See NodeJS v8 docs for more.)',
    'Allocated Heap Used (%)': percent(heapStats.used_heap_size, heapStats.total_heap_size) + '%',
    'Available Heap Allocated (%)': percent(heapStats.total_heap_size, heapStats.heap_size_limit) + '%',
    'System Uptime': formatTime(os.uptime()) + ' HH:MM:SS',
    'App Uptime': formatTime(process.uptime()) + ' HH:MM:SS',
  }

  // Show a header for the 'Stats' page that is as wide as the screen
  horizontalLine()
  centered('SYSTEM STATS')
  horizontalLine()
  verticalSpace(2)

  console.log(heapStats)

  // Log out each stat
  for (const key in stats) {
    if (!stats.hasOwnProperty(key)) continue
    const value = stats[key]
    let line = `\x1b[33m${key}\x1b[0m`
    const padding = 40 - line.length
    for (let i = 0; i < padding; i++) {
      line += ' '
    }
    line += value
    console.log(line)
    verticalSpace()
  }

  verticalSpace()
  horizontalLine()
}

// list users
cli.responders.listUsers = () => {
  dataLib.list('users', (err, list) => {
    if (err || !list || !list.length) return console.log('Oops, an error occured while getting users.')
    verticalSpace()
    list.forEach(userId => {
      dataLib.read('users', userId, (err, userData) => {
        if (err || !userData) return console.log('Oops, an error occured while getting users.')
        const numberOfChecks = Array.isArray(userData.checks) ? userData.checks.length : 0
        let name = `${yellow('Name')}: ${userData.firstName} ${userData.lastName}`
        let phone = `${yellow('Phone')}: ${userData.phone}`
        let regChecks = `${yellow('Registered Checks')}: ${numberOfChecks}`

        // Pad phone, and regChecks in the correct order
        phone = phone.padStart(phone.length + (40 - name.length), ' ')
        regChecks = regChecks.padStart(phone.length + (40 - phone.length), ' ')
        const line = name + phone + regChecks

        console.log(line)
      })
    })
  })
}

// user details
cli.responders.userDetails = input => {
  const userId = input.split('--')[1]
  if (!userId) return console.log('Please specify a user ID')

  dataLib.read('users', userId, (err, userData) => {
    if (err || !userData) return console.log('User not found.')
    delete userData.hashedPassword

    // Print the JSON text with highlighting
    verticalSpace()
    const json = JSON.stringify(userData, null, 2)

    console.log(jsonHightlight(json))
    verticalSpace()
  })
}

// list checks
cli.responders.listChecks = input => {
  const statesArr = input.toLowerCase().split('--').slice(1)
  const filteredStates = {}
  statesArr
  .filter(state => state === 'up' || state === 'down')
  .forEach(state => (filteredStates[state] = true))

  // If no state is defind, default to show both
  if (!filteredStates.down && !filteredStates.up) {
    filteredStates.up = true
    filteredStates.down = true
  }

  dataLib.list('checks', (err, list) => {
    if (err || !list || !list.length) return console.log('Oops, an error occured while getting checks.')
    verticalSpace()
    list.forEach(checkId => {
      dataLib.read('checks', checkId, (err, data) => {
        if (err || !data) return console.log('Oops, an error occured while getting the check.')
        let includeCheck = false
        let line = ''

        // Get the state, default to 'down'
        let state = data.state ? data.state : 'down'

        // Get the state, default to 'unknown'
        let stateOrUnknown = data.state ? state : 'unknown'

        if (filteredStates[state]) {
          line += `${yellow('ID')}: ${data.id}`
          line += ` | ${yellow('State')}: ${stateOrUnknown}`
          line += ` | ${yellow('Protocol')}: ${data.protocol}`
          line += ` | ${yellow('Method')}: ${data.method}`
          line += ` | ${yellow('URL')}: ${data.url}`
          line += ` | ${yellow('Last Checked')}: ${new Date(data.lastChecked) || 'unknown'}`

          console.log(line)
        }
      })
    })
  })
}

// check details
cli.responders.checkDetails = input => {
  const checkId = input.split('--')[1]
  if (!checkId) return console.log('Please specify a check ID')

  dataLib.read('checks', checkId, (err, checkData) => {
    if (err || !checkData) return console.log('Check not found.')

    // Print the JSON text with highlighting
    verticalSpace()
    const json = JSON.stringify(checkData, null, 2)

    console.log(jsonHightlight(json))
    verticalSpace()
  })
}

// list logs
cli.responders.listLogs = () => {
  logsLib.list(true, (err, logFileNames) => {
    if (err || !logFileNames) return console.log('Error reading logs')
    if (!logFileNames.length) return console.log('No logs to show!')

    logFileNames.forEach(filename => {
      if (!filename.includes('-')) return
      console.log(filename)
    })
  })
}

// log details
cli.responders.logDetails = input => {
  const logFileId = input.split('--')[1]
  if (!logFileId) return console.log('Please specify a user ID')

  logsLib.decompress(logFileId, (err, stringData) => {
    if (err || !stringData) return console.log('Log file not found.')
    // Split into lines
    const arr = stringData.split('\n')
    arr.forEach(jsonString => {
      try {
        const json = JSON.stringify(JSON.parse(jsonString), null, 2)
        console.log(jsonHightlight(json))
        horizontalLine()
      } catch (error) {}
    })
  })
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