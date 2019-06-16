/*
 * Library for storing and editing data
 *
 */

const fs = require('fs')
const path = require('path')

const { safeJSONparse } = require('./helpers')

/////////////////////////////////////////////////////////////////////////////////

const file = {}

// Base directory of the data folder
file.baseDir = path.join(__dirname, './../.data')

// Write data to a new file
file.create = (dir, filename, data, errCallback) => {
  // Open the file for writing
  fs.open(`${file.baseDir}/${dir}/${filename}.json`, 'wx', (err, fileDescriptor) => {
    if (err && !fileDescriptor)
      return errCallback('Could not create  new file, it may already exist.')

    // Conver data to string
    const stringData = JSON.stringify(data);

    // write to file and close it
    fs.writeFile(fileDescriptor, stringData, err => {
      if (err) return errCallback('Error writing to new file.')

      fs.close(fileDescriptor, (err) => {
        if (err) return errCallback('Error closing new file.')
        return errCallback(null)
      })
    })
  })
}

// Read data from a file
file.read = (dir, filename, callback) => {
  fs.readFile(`${file.baseDir}/${dir}/${filename}.json`, 'utf8', (err, data) => {
    if (err && !data) return callback(err, data)

    return callback(null, safeJSONparse(data))
  })
}

// Update the data from an existing file
file.update = (dir, filename, data, errCallback) => {
  // Open the file for updating
  fs.open(`${file.baseDir}/${dir}/${filename}.json`, 'r+', (err, fileDescriptor) => {
    if (err && !fileDescriptor)
      return errCallback('Could not open the file for updating, it may not exist yet.')

    // Conver data to string
    const stringData = JSON.stringify(data);

    // Truncate the file
    fs.ftruncate(fileDescriptor, err => {
      if (err) return errCallback('Error truncating file')

      // Write to the file and close it
      fs.writeFile(fileDescriptor, stringData, (err) => {
        if (err) return errCallback('Error updating the file.')

        fs.close(fileDescriptor, err => {
          if (err) return errCallback('Error closing the file after updating data.')

          return errCallback(null)
        })
      })
    })
  })
}

// Date the file
file.delete = (dir, filename, errCallback) => {
  // Unlink the file
  fs.unlink(`${file.baseDir}/${dir}/${filename}.json`, err => {
    if (err) return errCallback('Error deleteing/unlinking file.')
    return errCallback(null)
  })
}

// List all the items in a directory
file.list = (dir, callback) => {
  fs.readdir(`${file.baseDir}/${dir}/`, (err, data) => {
    if (err || !data || (Array.isArray(data) && data.length === 0)) {
      return callback('Error while listing files.')
    }

    const trimmedFileNames = data.map(fileName => fileName.replace('.json', ''))
    callback(null, trimmedFileNames)
  })
}

module.exports = file