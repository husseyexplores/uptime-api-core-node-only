/*
 * Library for storing and editing data
 *
 */

const fs = require('fs')
const path = require('path')

const lib = {}

// Base directory of the data folder
lib.baseDir = path.join(__dirname, './../.data')

// Write data to a new file
lib.create = (dir, filename, data, errCallback) => {
  // Open the file for writing
  fs.open(`${lib.baseDir}/${dir}/${filename}.json`, 'wx', (err, fileDescriptor) => {
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
lib.read = (dir, filename, callback) => {
  fs.readFile(`${lib.baseDir}/${dir}/${filename}.json`, 'utf8', (err, data) => {
    callback(err, data)
  })
}

// Update the data from an existing file
lib.update = (dir, filename, data, errCallback) => {
  // Open the file for updating
  fs.open(`${lib.baseDir}/${dir}/${filename}.json`, 'r+', (err, fileDescriptor) => {
    if (err && !fileDescriptor)
      return errCallback('Could not open the file for updating, it may not exist yet.')

    // Conver data to string
    const stringData = JSON.stringify(data);

    // Truncate the file
    fs.truncate(fileDescriptor, err => {
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
lib.delete = (dir, filename, errCallback) => {
  // Unlink the file
  fs.unlink(`${lib.baseDir}/${dir}/${filename}.json`, err => {
    if (err) return errCallback('Error deleteing/unlinking file.')
    return errCallback(null)
  })
}

module.exports = lib