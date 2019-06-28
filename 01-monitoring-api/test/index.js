const {
  getANumber,
  verticalSpace,
  leftSection,
  red,
  green,
  yellow,
  magenta,
  cyan,
} = require('../lib/helpers')


/////////////////////////////////////////////////////////////////////////////////

// Override the NODE_ENV variable
process.env.NODE_ENV = 'testing'

// App logic for the test runner
const _app = {}

_app.test = {
  unit: require('./unit'),
  api: require('./api'),
}

// Count all the tests
_app.countTests = () => {
  let totalTests = 0

  for (const key in _app.test) {
    if (!_app.test.hasOwnProperty(key)) continue
    const subTests = _app.test[key]

    for (const testName in subTests) {
      if (!subTests.hasOwnProperty(testName)) continue
      const testFn = subTests[testName]
      if (typeof testFn !== 'function') {
        throw new Error(`Expected ${testName} to be a function, but found ${typeof testName}`)
      }
      totalTests++
    }
  }
  return totalTests
}

// Runs all the tests, collecting all the erros and success from those test
_app.runTests = () => {
  const errors = []
  let success = 0
  const limit = _app.countTests()
  let counter = 0

  for (const key in _app.test) {
    if (!_app.test.hasOwnProperty(key)) continue
    const subTests = _app.test[key]
    for (const testName in subTests) {
      if (!subTests.hasOwnProperty(testName)) continue
      const testFn = subTests[testName]

      // Call the test
      try {
        testFn(() => {
          // If it calls back without throwing, then it succeeded
          console.log('\x1b[32m%s\x1b[0m', counter + 1 + '. ' + testName)
          counter++
          success++
          if (counter === limit) {
            _app.produceTestReport(limit, success, errors)
          }
        })
      } catch (e) {
        // If it fails, that means an error
        errors.push({ name: testName, error: e, num: counter + 1 })
        console.log('\x1b[31m%s\x1b[0m', counter + 1 + '. ' + testName)
        counter++
        if (counter === limit) {
          _app.produceTestReport(limit, success, errors)
        }
      }
    }
  }
}

// Product a test outcome report
_app.produceTestReport = (limit, success, errors) => {
  leftSection('BEGIN TEST REPORT')

  const _errColor = errors.length === 0 ? green : red
  console.log('Total Tests:', yellow(limit))
  console.log('Passed:', green(success))
  console.log('Failed:', _errColor(errors.length))

  verticalSpace()

  // If There are errors, print the details
  if (errors.length > 0) {
    leftSection('BEGIN ERROR DETAILS')

    errors.forEach(({ error, name, num }, i) => {
      console.log(red(`${num}. ${name}`))
      console.log(JSON.stringify(error, null, 2))
      verticalSpace()
      i + 1  !== errors.length && console.log('---------------------  ---------------------')
      i + 1  !== errors.length && verticalSpace()
    })

    leftSection('END OF ERROR DETAILS')
  }

  leftSection('END OF TEST REPORT')
  process.exit(0)
}

// Run the test
_app.runTests()
