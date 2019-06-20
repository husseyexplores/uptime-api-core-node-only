/*
 * Frontend logic for the app
 *
 */

// Container for the front-end app
const app = {}

// Config
app.config = {
  sessionToken: false,
}

// AJAX client for the RESTful API
app.client = {}

// Interface for making API calls
app.client.request = (headers, path, method, queryStringObject, payload, callback) => {
  const isValidMethod = mthd => ['POST', 'GET', 'PUT', 'DELETE'].some(v => v === mthd.toUpperCase())

  // Set default
  headers = headers instanceof Object ? headers : {}
  path = typeof path === 'string' ? ('/' + path).replace(/^\/+/gi, '/') : '/'
  console.log(path)
  method = typeof path === 'string' && isValidMethod(method) ? method.toUpperCase() : 'GET'
  queryStringObject = queryStringObject instanceof Object ? queryStringObject : {}
  payload = payload instanceof Object ? payload : {}
  callback = typeof callback === 'function' ? callback : () => {}

  // For each query string parameter, add it to the url
  let requestUrl = path
  let paramCount = 0
  for (const key in queryStringObject) {
    if (!queryStringObject.hasOwnProperty(key)) continue
    paramCount++
    // Append the first param with a '?' and the rest with '&'
    requestUrl += paramCount === 1 ? `?${key}=${queryStringObject[key]}` : `&${key}=${queryStringObject[key]}`
  }

  let xhr = new XMLHttpRequest()
  xhr.open(method, requestUrl, true)
  xhr.setRequestHeader('Content-Type', 'application/json')

  // For each header sent, add it to the request one by one.
  for (const key in headers) {
    if (!headers.hasOwnProperty(key)) continue
    xhr.setRequestHeader(key, headers[key])
  }

  // If there is a current session token set, add that as a header
  if (app.config.sessionToken) {
    xhr.setRequestHeader('token', app.config.sessionToken.id)
  }

  // When the request comes back, handle the response
  xhr.onreadystatechange = e => {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      const statusCode = xhr.status
      const response = xhr.responseText
      try {
        const parsedResponse = JSON.parse(response)
        callback(statusCode, parsedResponse)
      } catch (error) {
      }
    }
  }

  // Sent the payload as JSON
  const payloadString = JSON.stringify(payload)
  xhr.send(payloadString)
}
