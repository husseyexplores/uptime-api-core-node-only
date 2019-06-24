/*
 * Frontend logic for the app
 *
 */
const log = {
  green: (...args) => args.forEach(arg => typeof arg === 'string' ? console.log('%c' + arg, 'display: inline-block; font-weight: 700; letter-spacing: 2px; padding: 6px 12px; background: #73e09e; color: #025021;') : console.log(arg)),

  red: (...args) => args.forEach(arg => typeof arg === 'string' ? console.log('%c' + arg, 'display: inline-block; font-weight: 700; letter-spacing: 2px; padding: 6px 12px; background: pink; color: #890000;') : console.log(arg)),

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
app.logUserOut = (redirectUser, callback) => {
  redirectUser = typeof redirectUser === 'string' || typeof redirectUser === 'boolean'
    ? redirectUser
    : '/session/deleted'
  callback = typeof callback === 'function' ? callback : () => {}

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
      if (typeof redirectUser === 'string') {
        window.location = '/session/deleted'
      } else if (typeof redirectUser === 'boolean' && !redirectUser) {
        callback(true)
      }
    },
    error: (statusCode, response) => {
      log.red('Error logging out. Got the following response: ')
      console.log(response)
      callback(false)
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
        const el = elements[i]
        if (el.type === 'submit') continue

        // Determine class of element and set value accordingly
        const { classList, type, checked } = el
        let { value, name } = el
        const classOfElement = typeof classList.value === 'string'
          && classList.value.length > 0
          ? classList.value : ''

        value = type === 'checkbox' && classOfElement.indexOf('multiselect') === -1
        ? checked
        : classOfElement.indexOf('intval') === -1
        ? value : parseInt(value, 10)

        // Override the method of the form if the input's name is _method
        if (name === '_method') {
          method = value
        } else {
          // Create an payload field named "method" if the elements name is actually httpmethod
          if(name === 'httpmethod'){
            name = 'method'
          }

          // Create an payload field named 'id' if the elements name is actually uid
          if (name === 'uid'){
            name = 'id'
          }

          // If the element has the class "multiselect" add its value(s) as array elements
          if (classOfElement.indexOf('multiselect') > -1) {
            if (checked) {
              payload[name] = payload[name] instanceof Array ? payload[name] : []
              payload[name].push(value)
            }
          } else {
            payload[name] = value
          }
        }
      }

      // If the method is DELETE, the queryString should be the payload object instead
      const queryString = method === 'DELETE' ? payload : {}

      // Call the API
      app.client.request({
        url: path,
        method,
        data: payload,
        qs: queryString,
        success: (statusCode, response) => {
          const responsePayload = response.data
          // If successful, send to form response processor
          app.formResponseProcessor(formId,payload,responsePayload);
        },
        error: (statusCode, response) => {
          if (statusCode === 403) {
            // Unauthorized access - log the user out
            return app.logUserOut()
          }

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
  if(formId === 'sessionCreate') {
    app.setSessionToken(responsePayload)
    window.location = '/checks/all'
  }

  // If forms saved successfully and they have success messages, show them
  const formsWithSuccessMessages = ['accountEdit1', 'accountEdit2', 'checksEdit1']
  if (formsWithSuccessMessages.indexOf(formId) !== -1) {
    document.querySelector(`#${formId} .formSuccess`).style.display = 'block'
  }

  // If the user just deleted their account, redirect them to the account-delete page
  if (formId === 'accountEdit3') {
    return app.logUserOut('/account/deleted');
  }

  // If the user just created a new check successfully, redirect back to the dashboard
  if (formId === 'checksCreate') {
    return window.location = '/checks/all';
  }

  // If the user just deleted a check, redirect them to the dashboard
  if (formId === 'checksEdit2') {
    return window.location = '/checks/all';
  }
}

// Load the dashboard page data - all user checks
app.loadChecksListPage = () => {
  // Get the phone number from the current token, or log the user out if none is there
  const { sessionToken : token } = app.config
  const phone = token && typeof token.phone  === 'string' ? token.phone : null
  if (!phone) return app.logUserOut()

  // Fetch the user data
  app.client.request({
    url: '/api/users',
    method: 'GET',
    qs: { phone },
    error: () => {
      // log the user out (assuming that the api is temporarily down or the users token is bad)
      app.logUserOut()
    },
    success: (statusCode, response) => {
      const responsePayload = response.data
      // Determine how many checks the user has
      const allChecks = typeof responsePayload.checks === 'object' && responsePayload.checks instanceof Array && responsePayload.checks.length > 0 ? responsePayload.checks : [];

      if(allChecks.length === 0) {
        // Show 'you have no checks' message
        document.getElementById('noChecksMessage').style.display = 'table-row';

        // Show the createCheck CTA
        document.getElementById('createCheckCTA').style.display = 'block';
        return
      }

      if (allChecks.length < 5){
        // Show the createCheck CTA
        document.getElementById('createCheckCTA').style.display = 'block'
      } else {
        document.getElementById('createCheckCTA').style.display = 'none'
      }

      // Show each created check as a new row in the table
      allChecks.forEach(checkId => {
        // Get the data for the check
        app.client.request({
          url: 'api/checks',
          method: 'GET',
          qs: { id: checkId },
          error: () => { log.red(`Error trying to load check ID: ${checkId}`) },
          success: (statusCode, response) => {
            const check = response.data
            // Make the check data into a table row
            const table = document.getElementById('checksListTable')
            const tr = table.insertRow(-1)
            tr.classList.add('checkRow')
            const td0 = tr.insertCell(0)
            const td1 = tr.insertCell(1)
            const td2 = tr.insertCell(2)
            const td3 = tr.insertCell(3)
            const td4 = tr.insertCell(4)
            td0.innerHTML = check.url
            td1.innerHTML = check.protocol + '://'
            td2.innerHTML = check.method.toUpperCase()
            const state = typeof check.state === 'string' ? check.state : 'unknown'
            td3.innerHTML = state
            td4.innerHTML = `<a href="/checks/edit?id=${check.id}">View / Edit / Delete</a>`
          }
        })
      })
    }
  })
}

// Load the checks edit page specifically
app.loadChecksEditPage = () => {
  const queryString = {};
  window.location.href.split(/\?|&/).slice(1).forEach(rawQs => {
    if (rawQs.indexOf('=') === -1) return
    const [name, value] = rawQs.split('=')
    queryString[name] = value
  })

  if (!queryString.id){
    return (window.location = '/checks/all')
  }

  app.client.request({
    url: '/api/checks',
    method: 'GET',
    qs: { id: queryString.id },
    error: () => {
      // If the request comes back as something other than 200, redirect back to dashboard
      window.location = '/checks/all';
    },
    success: (statusCode, response) => {
      const responsePayload = response.data
      // Put the hidden id field into both forms
      const hiddenIdInputs = document.querySelectorAll('input.hiddenIdInput')
      for (let i = 0; i < hiddenIdInputs.length; i++) {
        hiddenIdInputs[i].value = responsePayload.id
      }

      const state = responsePayload.state ? responsePayload.state : 'unknown'

      // Put the data into the top form as values where needed
      document.querySelector('#checksEdit1 .displayIdInput').value = responsePayload.id
      document.querySelector('#checksEdit1 .displayStateInput').value = state
      document.querySelector('#checksEdit1 .protocolInput').value = responsePayload.protocol
      document.querySelector('#checksEdit1 .urlInput').value = responsePayload.url
      document.querySelector('#checksEdit1 .methodInput').value = responsePayload.method
      document.querySelector('#checksEdit1 .timeoutInput').value = responsePayload.timeoutSeconds
      const successCodeCheckboxes = document.querySelectorAll('#checksEdit1 input.successCodesInput')

      for (let i = 0; i < successCodeCheckboxes.length; i++) {
        if (responsePayload.successCodes.indexOf(parseInt(successCodeCheckboxes[i].value)) > -1) {
          successCodeCheckboxes[i].checked = true
        }
      }
    },
  })
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
    return callback(true)
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

  // Logic for dashboard page
  if(primaryClass == 'checksList'){
    app.loadChecksListPage();
  }

  // Logic for check details page
  if(primaryClass == 'checksEdit'){
    app.loadChecksEditPage();
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