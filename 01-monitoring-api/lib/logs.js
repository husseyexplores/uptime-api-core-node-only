/*
 * Library for storing and rotating logs
 *
 */

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const { safeJSONparse } = require('./helpers')

/////////////////////////////////////////////////////////////////////////////////

const logs = {}

logs.baseDir = path.join(__dirname, '../.logs')

// Append a string to a file. Create the file if it does not exist
logs.append = (fileName, data, callback) => {
  // Open the file
  fs.open(`${logs.baseDir}/${fileName}.log`, 'a', (err, fd) => {
    if (err || !fd) {
      return callback(`Error: Could not open file ${fileName} for appending.`)
    }

    // Append to file and close it
    fs.appendFile(fd, data + '\n', err => {
      if (err) {
        return callback(`Error: Could not append data to file ${fileName}.`)
      }

      fs.close(fd, err => {
        if (err) return callback(`Error: Could not close file ${fileName} after appending log.`)

        callback(null)
      })
    })
  })
}

// List all the logs and optionally include the compressed logs
logs.list = (includeCompressedLogs, callback) => {
  fs.readdir(logs.baseDir, (err, data) => {
    if (err || !data) {
      return callback(err, data)
    }

    const fileNames = data.filter(name => {
      if (name.includes('.log')) {
        return name.replace('.log', '')
      }

      if (name.includes('.gz.b64')) {
        return name.replace('.gz.b64', '')
      }

      return false
    })

    callback(null, fileNames)
  })
}

// Compress the contents of one .log file into .gz.b64 file within the same directory
logs.compress = (logId, compressedFileId, callback) => {
  const sourceFile = logId + '.log'
  const destFile = compressedFileId + '.gz.b64'

  // Read the source file
  fs.readFile(`${logs.baseDir}/${sourceFile}` , 'utf8', (err, data) => {
    if (err || !data) {
      return callback(err)
    }

    // Compress the data using gzip
    zlib.gzip(data, (err, buffer) => {
      if (err || !buffer) {
        return callback(err)
      }

      // Send the data to the destination file
      fs.open(`${logs.baseDir}/${destFile}`, 'wx', (err, fd) => {
        if (err || !fd) {
          return callback(err)
        }

        // Write to the file
        fs.writeFile(fd, buffer.toString('base64'), err => {
          if (err) {
            return callback(err)
          }

          // Close the file
          fs.close(fd, err =>{
            if (err) {
              return callback(err)
            }

            callback(null)
          })
        })
      })
    })
  })
}

// Decompress the contents of a .gz.b64 file into a string
logs.decompress = (fileId, callback) => {
  const fileName = fileId + '.gz.b64'

  // Read the source file
  fs.readFile(`${logs.baseDir}/${fileName}` , 'utf8', (err, data) => {
    if (err || !data) {
      return callback(err)
    }

    // Decompress the data
    const inputBuffer = Buffer.from(data, 'base64')
    zlib.unzip(buffer, (err, outputBuffer) => {
      if (err || !outputBuffer) {
        return callback(err)
      }

      callback(null, outputBuffer.toString())
    })
  })
}

// Truncate a log file
logs.truncate = (logId, callback) => {
  fs.truncate(`${logs.baseDir}/${logId}.log`, 0, (err) => {
    if (err) {
      return callback(err)
    }

    callback(null)
  })
}

module.exports = logs