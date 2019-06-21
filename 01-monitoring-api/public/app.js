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
app.client.request = ({ headers, url, method, qs, data, success, error } = {}) => {
  const isValidMethod = mthd => ['POST', 'GET', 'PUT', 'DELETE'].some(v => v === mthd.toUpperCase())

  // Set default
  headers = headers instanceof Object ? headers : {}
  url = typeof url === 'string' ? ('/' + url).replace(/^\/+/gi, '/') : '/ping'
  method = typeof method === 'string' && isValidMethod(method) ? method.toUpperCase() : 'GET'
  qs = qs instanceof Object ? qs : {}
  data = data instanceof Object ? data : {}
  success = typeof success === 'function' ? success : () => {}
  error = typeof error === 'function' ? error : () => {}

  // For each query string parameter, add it to the url
  let requestUrl = url
  let paramCount = 0
  for (const key in qs) {
    if (!qs.hasOwnProperty(key)) continue
    paramCount++
    // Append the first param with a '?' and the rest with '&'
    requestUrl += paramCount === 1 ? `?${key}=${qs[key]}` : `&${key}=${qs[key]}`
  }

  const xhr = new XMLHttpRequest()
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

      // Choose the 'success' or 'error' fn as callback based on the status code
      const callback = statusCode >= 200 && statusCode < 300 ? success : error
      try {
        const parsedResponse = JSON.parse(response)
        callback(statusCode, parsedResponse)
      } catch (error) {
        callback(statusCode, response)
      }
    }
  }

  // Send the payload as JSON
  xhr.send(JSON.stringify(data))
}
