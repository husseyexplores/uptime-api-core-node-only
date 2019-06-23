/*
 * Frontend logic for the app
 *
 */
const log = {
  green: (...args) => args.forEach(arg => typeof arg === 'string' ? console.log('%c' + arg, 'display: inline-block; font-weight: 700; letter-spacing: 2px; padding: 6px 12px; background: #73e09e; color: #025021;') : console.log(arg)),

  red: (...args) => args.forEach(arg => typeof arg === 'string' ? console.log('%c' + arg, 'display: inline-block; font-weight: 700; letter-spacing: 2px; padding: 6px 12px; background: pink; color: #fff;') : console.log(arg)),

  magenta: (...args) => args.forEach(arg => typeof arg === 'string' ? console.log('%c' + arg, 'display: inline-block; font-weight: 700; letter-spacing: 2px; padding: 6px 12px; background: #9f049d; color: #fff;') : console.log(arg)),
}
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

// Log out the user then redirect them
app.logUserOut = () => {
  // Get the current token id
  const { sessionToken: token } = app.config
  const tokenId = token && typeof token.id === 'string' && token.id
  if (!tokenId) return log.red('Error logging out. Failed to find tokenId.')

  app.client.request({
    url: '/api/tokens',
    method: 'DELETE',
    qs: { id: tokenId },
    success: (statusCode, response) => {
      // Update the app.config token as false
      app.setSessionToken(false)

      // Send the user to the logged out page,
      window.location = '/session/deleted'
    }
  })
}

// Bind the logout button
app.bindLogoutButton = () => {
  const logoutButton = document.getElementById('logoutButton')
  if (!logoutButton) return

  logoutButton.addEventListener('click', e => {
    e.preventDefault()
    app.logUserOut()
  })
}

// Bind the forms
app.bindForms = () => {
  const forms = document.querySelectorAll('form')
  if (!forms.length) return

  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      // Stop it from submitting
      e.preventDefault();
      const formId = this.id;

      // Remove host name from request path, because request client function prepends it
      const regex = new RegExp('(https?:\/\/)?' + window.location.host, 'gi')
      const path = this.action.replace(regex, '')
      let method = this.method.toUpperCase()

      // Hide the error message (if it's currently shown due to a previous error)
      document.querySelector(`#${formId} .formError`).style.display = 'hidden'

      // Turn the inputs into a payload
      const payload = {}
      const elements = this.elements
      for (let i = 0; i < elements.length; i++) {
        if (elements[i].type !== 'submit') {
          const valueOfElement = elements[i].type == 'checkbox' ? elements[i].checked : elements[i].value
          if (elements[i].name == '_method') {
            method = valueOfElement
          } else {
            payload[elements[i].name] = valueOfElement
          }
        }
      }

      // Call the API
      app.client.request({
        url: path,
        method,
        data: payload,
        success: (statusCode, response) => {
          const responsePayload = response.data
          // If successful, send to form response processor
          app.formResponseProcessor(formId,payload,responsePayload);
        },
        error: (statusCode, response) => {
          // Try to get the error from the api, or set a default error message
          var error = typeof(response._error) == 'string' ? response._error : 'An error has occured, please try again';

          // Set the formError field with the error text
          document.querySelector(`#${formId} .formError`).innerHTML = error;

          // Show (unhide) the form error field on the form
          document.querySelector(`#${formId} .formError`).style.display = 'block';
        },
      })
    })
  })
}

// Form response processor
app.formResponseProcessor = (formId, requestPayload, responsePayload) =>{
  var functionToCall = false
  // If account creation was successful, try to immediately log the user in
  if(formId === 'accountCreate') {
    // Take the phone and password, and use it to log the user in
    const createSesionPayload = {
      phone : requestPayload.phone,
      password : requestPayload.password,
    }

    app.client.request({
      url: 'api/tokens',
      method: 'POST',
      data: createSesionPayload,
      success: (statusCode, response) => {
        const responsePayload = response.data
        // If successful, set the token and redirect the user
        app.setSessionToken(responsePayload);
        window.location = '/checks/all'
      },
      error: (statusCode, response) => {
        // Try to get the error from the api, or set a default error message
        const error = typeof(response._error) == 'string' ? response._error : 'Sorry, an error has occured. Please try again.'

        // Set the formError field with the error text
        document.querySelector("#"+formId+" .formError").innerHTML = error

        // Show (unhide) the form error field on the form
        document.querySelector("#"+formId+" .formError").style.display = 'block'
      },
    })
  }

  // If login was successful, set the token in localstorage and redirect the user
  if(formId === 'sessionCreate'){
    app.setSessionToken(responsePayload)
    window.location = '/checks/all'
  }

  // If forms saved successfully and they have success messages, show them
  const formsWithSuccessMessages = ['accountEdit1', 'accountEdit2']
  if (formsWithSuccessMessages.indexOf(formId) !== -1) {
    document.querySelector(`#${formId} .formSuccess`).style.display = 'block'
  }
}

// Get the session token from localstorage and set it in the app.config object
app.getSessionToken = () => {
  const tokenString = localStorage.getItem('token')

  if (typeof tokenString === 'string') {
    try {
      const token = JSON.parse(tokenString)
      app.config.sessionToken = token
      if (typeof token === 'object') {
        app.setLoggedInClass(true)
      } else {
        app.setLoggedInClass(false)
      }
    } catch(e){
      app.config.sessionToken = false
      app.setLoggedInClass(false)
    }
  }
}

// Set (or remove) the loggedIn class from the body
app.setLoggedInClass = add => {
  const target = document.querySelector("body");
  add ? target.classList.add('loggedIn') : target.classList.remove('loggedIn')
}

// Set the session token in the app.config object as well as localstorage
app.setSessionToken = (token) => {
  app.config.sessionToken = token

  if (token && typeof token === 'object' && token.id) {
    tokenString = JSON.stringify(token)
    localStorage.setItem('token', tokenString)
    app.setLoggedInClass(true)
  } else {
    localStorage.removeItem('token')
    app.setLoggedInClass(false)
  }
}

// Renew the token
app.renewToken = callback => {
  const currentToken = typeof app.config.sessionToken === 'object' ? app.config.sessionToken : false
  if (!currentToken) {
    app.setSessionToken(false)
    callback(true)
  }

  // Update the token with a new expiration
  const payload = {
    id : currentToken.id,
    extend : true,
  }

  app.client.request({
    url: '/api/tokens',
    method: 'PUT',
    data: payload,
    success: (statusCode, response) => {
      const responsePayload = response.data
      // Update the token data in the app
      app.setSessionToken(responsePayload)
      callback(false)
    },
    error: () => {
      app.setSessionToken(false)
      callback(true)
    }
  })
}

// Loop to renew token often
app.tokenRenewalLoop = () => {
  setInterval(() => {
    app.renewToken(err => {
      if (err) return log.red("Error renewing token @ " + Date.now())
      log.green("Token renewed successfully @ " + Date.now())
    })
  }, 1000 * 60) // once a minute minute
}

// Load data on the page
app.loadDataOnPage = () => {
  // Get the current page from the body class
  const bodyClasses = document.querySelector('body').classList
  const primaryClass = typeof bodyClasses[0] === 'string' ? bodyClasses[0] : false

  // Logic for account settings page
  if (primaryClass === 'accountEdit') {
    app.loadAccountEditPage()
  }
}

// Load the account edit page specifically
app.loadAccountEditPage = function(){
  // Get the phone number from the current token, or log the user out if none is there
  const { sessionToken: token } = app.config
  const phone = token && typeof token.phone === 'string' ? token.phone : null

  if (!phone) {
    // If the request comes back as something other than 200, log the user our (on the assumption that the api is temporarily down or the users token is bad)
    return app.logUserOut();
  }

  app.client.request({
    url: '/api/users',
    method: 'GET',
    qs: { phone },
    success: (statusCode, response) => {
      const responsePayload = response.data
      // Put the data into the forms as values where needed
      document.querySelector('#accountEdit1 .firstNameInput').value = responsePayload.firstName;
      document.querySelector('#accountEdit1 .lastNameInput').value = responsePayload.lastName;
      document.querySelector('#accountEdit1 .displayPhoneInput').value = responsePayload.phone;

      // Put the hidden phone field into both forms
      var hiddenPhoneInputs = document.querySelectorAll('input.hiddenPhoneNumberInput');
      for(let i = 0; i < hiddenPhoneInputs.length; i++){
          hiddenPhoneInputs[i].value = responsePayload.phone;
      }
    },
    error: () => {
      app.logUserOut()
    },
  })
}

// Init (bootstrapping)
app.init = function(){
  log.magenta('App Initialized!')
  // Bind all form submissions
  app.bindForms()

  // Get the token from localstorage
  app.getSessionToken()

  // Bind logout button
  app.bindLogoutButton()

  // Renew token
  app.tokenRenewalLoop()

  // Load data conditionally for respective pages
  app.loadDataOnPage()
}

// Call the init processes after the window loads
window.onload = function(){
  app.init()
}