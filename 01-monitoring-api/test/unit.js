const assert = require('assert')
const { getANumber } = require('../lib/helpers')
const logs = require('../lib/logs')

/////////////////////////////////////////////////////////////////////////////////

const unit = {}

unit['helpers.getANumber should return a number'] = done => {
  const value = getANumber()
  assert.equal(typeof value, 'number')
  done()
}

unit['helpers.getANumber should return 1 by default'] = done => {
  const value = getANumber()
  assert.equal(value, 1)
  done()
}

unit['helpers.getANumber should return 3 by default'] = done => {
  const value = getANumber()
  assert.equal(value, 3)
  done()
}

unit['helpers.getANumber should return whatever is passed to it'] = done => {
  const value = getANumber(5)
  assert.equal(value, 5)
  done()
}

unit['logs.list should callback a false error and an array of log filenames'] = done => {
  logs.list(true, (err, filenames) => {
      assert.equal(!!err, false)
      assert.equal(filenames instanceof Array, true)
      assert.equal(filenames.length > 0, true)
      done()
  })
}

unit['logs.truncate should not throw if the logId does not exist'] = done => {
  logs.truncate('someFalseId', err => {
    assert.doesNotThrow(() => {
      logs.truncate('Some fake  Id', err => {
        assert.ok(err)
        done()
      })
    }, TypeError)
  })
}

module.exports = unit
