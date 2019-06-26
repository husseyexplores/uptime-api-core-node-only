/*
 * Background worker related tasks
 *
 */

const path = require('path')
const fs = require('fs')
const http = require('http')
const https = require('https')
const nodeURL = require('url')
const util = require('util')

const dataLib = require('./data')
const logs = require('./logs')
const {
  isArray,
  arrayOf,
  hasLength,
  isInteger,
  inRange,
  isObject,
  isString,
  sendtwilioSMS,
} = require('./helpers')

const debug = util.debuglog('workers')

/////////////////////////////////////////////////////////////////////////////////

const workers = {}

// Looks up all checks, get their data, send to a validator
workers.gatherAllChecks = () => {
  // Get all the checks that exists in the system
  dataLib.list('checks', (err, checks) => {
    if (err || !checks || (Array.isArray(checks) && checks.length === 0)) {
      return debug('Error: Could not find any checks to process')
    }

    checks.forEach(check => {
      // Read in the check data
      dataLib.read('checks', check, (err, originalCheckData) => {
        if (err || !originalCheckData) {
          return debug(`Error reading one the checks data in 'gatherAllChecks' fn. Check id: ${check}`)
        }

        // Pass the data to the check validor
        workers.validateCheckData(originalCheckData)
      })
    });
  })
}

// Sanity checking the check data
workers.validateCheckData = data => {
  data = isObject(data) ? data : {}
  let { id, userPhone, protocol, method, url, successCodes, timeoutSeconds, state, lastChecked } = data

  id = isString(id) && id.length === 20 && id
  userPhone = isString(userPhone) && userPhone.length === 10 && userPhone
  protocol = isString(protocol) && ['http', 'https'].includes(protocol) && protocol
  url = isString(url) && url.trim().length > 0 && url.trim()
  method = isString(method) && ['post', 'get', 'put', 'delete'].includes(method) && method
  successCodes = isArray(successCodes) && arrayOf('integers', successCodes) && hasLength(successCodes) && successCodes
  timeoutSeconds = isInteger(timeoutSeconds) && inRange(timeoutSeconds, 1, 5) && timeoutSeconds

  // Set the keys may not be set if the works have never seen this checks before
  state = isString(state) && ['up', 'down'].includes(state) ? state : 'down'
  lastChecked = isInteger(lastChecked) && lastChecked > 0 && lastChecked

  // If all the values pass, then forward the data to the next step in the process
  if (!id || !userPhone || !protocol || !url || !method || !successCodes || !timeoutSeconds) {
    return debug(`Check validation failed on check: ${id}. Check is not properly formatted.`)
  }

  const validatedData = { ...data, id, userPhone, protocol, url, method, successCodes, timeoutSeconds }

  // Perform the check
  workers.performCheck(validatedData)
}

workers.performCheck = data => {
  const { protocol, url, method, timeoutSeconds } = data

  // Prepare the initial argument
  const checkOutcome = { error: false, responseCode: null }

  // Mark that the outcome has not been sent yet - flag
  let outcomeSent = false

  // Parse the hostname and the path out of the check data
  const parsedURL = nodeURL.parse(`${protocol}://${url}`, true)

  // using `path`, not `pathname` because we want the query string in the url, if any
  const { hostname, path } = parsedURL

  // construct the request
  const requestDetails = {
    protocol: protocol + ':',
    hostname,
    method: method.toUpperCase(),
    path,
    timeout: timeoutSeconds * 1000 // convert to millisec
  }

  // Instantiate the request object using either the http or https module
  const _moduleToUse = protocol === 'http' ? http : https

  const request = _moduleToUse.request(requestDetails, res => {
    // Grab the status of the sent request
    const { statusCode } = res

    // Update the check outcome and pass the data along
    checkOutcome.responseCode = statusCode
    if (!outcomeSent) {
      workers.processCheckOutcome(data, checkOutcome)
      outcomeSent = true
    }
  })

  // Bind to the error so it doesn't get thrown
  request.on('error', err => {
    // Update the check outcome and pass the data alaong
    checkOutcome.error = { error: true, value: err }

    if (!outcomeSent) {
      workers.processCheckOutcome(data, checkOutcome)
      outcomeSent = true
    }
  })

  // Bind to the timeout event
  request.on('timeout', () => {
    // Update the check outcome and pass the data alaong
    checkOutcome.error = { error: true, value: 'timeout' }

    if (!outcomeSent) {
      workers.processCheckOutcome(data, checkOutcome)
      outcomeSent = true
    }
  })

  // End the request
  request.end()
}

// Process the check outcome, update the check data as needed, trigger an alert if needed
// Special logic for acomodating a check that has never been test/run before ('Don't alert the user')
workers.processCheckOutcome = (data, checkOutcome) => {
  // Decide if the check is considered up or down in the current state
  const state = !checkOutcome.error && checkOutcome.responseCode && data.successCodes.includes(checkOutcome.responseCode) ? 'up' : 'down'

  // Decide if the alert is warranted
  const alertWarranted = data.lastChecked && data.state !== state

  const timeOfCheck = Date.now()

  // Log the outcome
  workers.log({ check: data, outcome: checkOutcome, state, alert: alertWarranted, time: timeOfCheck })

  // Update the check data
  const newCheckData = data
  newCheckData.state = state
  newCheckData.lastStatus = checkOutcome.responseCode
  newCheckData.lastChecked = timeOfCheck

  // Save the updates
  dataLib.update('checks', data.id, newCheckData, err => {
    if (err) {
      return debug(`Error trying to save updates to one of the checks: ${data.id}`)
    }

    // Send the new check data to the next phase in the process if needed
    if (alertWarranted) {
      workers.alertUserToStatusChange(newCheckData)
    } else {
      debug(`Check outcome has not been changed for ${data.id}. No alert needed`)
    }
  })
}

// Alert to a user as to change in their check status
workers.alertUserToStatusChange = checkData => {
  const msg = `Alert: Your check for ${checkData.method.toUpperCase()} ${checkData.protocol}://${checkData.url} is currently ${checkData.state}`

  // Initiate the call to alert the user
  sendtwilioSMS(checkData.userPhone, msg, err => {
    if (err) {
      return debug(`Error sending sms to ${checkData.userPhone}`, err)
    }

    debug(`Success: ${checkData.userPhone} was alerted to a status change in their check via sms.`, '\n', msg)
  })

}

// Log the checks status
workers.log = ({ check, outcome, state, alert, time }) => {
  // Form the log data
  const logData = JSON.stringify({ check, outcome, state, alert, time })

  // Determine the name of the log file
  const fileName = check.id

  // Append the log data to the file
  logs.append(fileName, logData, err => {
    if (err) {
      return debug(`Error: Logging to file ${fileName} failed.`)
    }

    debug(`Logging to file ${fileName} succeeded.`)
  })
}

// Timer to execute the worker-process once per minute
workers.loop = () => setInterval(workers.gatherAllChecks, 1000 * 60); // one minute

// Rotate and compress the log files
workers.rotateLogs = () => {
  // List all the non-compressed log files
  logs.list(false, (err, logFileNames) => {
    if (err || !logFileNames || !hasLength(logFileNames)) {
      return debug('Error: Could not find any logs to rotate.')
    }

    logFileNames.forEach(fileName => {
      // Compress the data to a different file
      const logId = fileName.replace('.log', '')

      const compressedFileId = `${logId}-${Date.now()}`
      logs.compress(logId, compressedFileId, err => {
        if (err) {
          return debug(`Error: Could not compress the ${logId} log file.`, err)
        }

        // Truncate the log
        logs.truncate(logId, err => {
          if (err) {
            return debug(`Error: Could not truncate the ${compressedFileId} log file.`, err)
          }

          debug(`Success truncating the ${compressedFileId} log file.`)
        })

      })
    })
  })
}

// Timer to execute the log rotation process once per day
workers.logRotationLoop = () => setInterval(workers.rotateLogs, 1000 * 60 * 60 * 24); // one day

workers.init = () => {
  console.log('\x1b[33m%s\x1b[0m', 'Background workers have been started.')

  // Execute all the checks immediately once the app starts
  workers.gatherAllChecks()

  // Call the loop so the checks will execute late on
  workers.loop()

  // Comppress all the logs immediately
  workers.rotateLogs()

  // Call the compression loop so the logs will be compress later on
  workers.logRotationLoop()
}

module.exports = workers