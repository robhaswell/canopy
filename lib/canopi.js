const individual = require('individual')
const levels = ['debug', 'info', 'warn', 'error']
const stringify = require('fast-safe-stringify')

const canopiConfig = individual('__CANOPI_CONFIG', {
  outputStream: null,
  dateProvider: () => new Date(),
  errorHandlers: [],
  formatters: {}
})

class CanopiUsageError extends Error {
  constructor (message) {
    super(message)
    this.name = 'CanopiUsageError'
    this.message = message
  }
}

const _parseArgs = (a1, a2) => {
  let logName
  let obj = {}

  if (a2 !== undefined) {
    if (typeof (a1) !== 'string' && a1 !== undefined) {
      throw new TypeError('When providing two arguments, first argument must be a string or undefined')
    }
    if (typeof (a2) !== 'object') {
      throw new TypeError('When providing two arguments, second argument must be an object')
    }
    logName = a1
    obj = a2
  } else if (a1 !== undefined) {
    if (typeof (a1) === 'string') {
      logName = a1
    } else if (typeof (a1) === 'object') {
      obj = a1
    } else {
      throw new TypeError('Argument must be a name or object', a1)
    }
  } else {
    logName = undefined
    obj = {}
  }
  return [logName, obj]
}

function canopi (a1, a2) {
  const [logName, obj] = _parseArgs(a1, a2)

  function canopiLogger (a1, a2) {
    const [newNamePart, newObjParts] = _parseArgs(a1, a2)
    const parts = [logName, newNamePart].filter(Boolean)
    const newName = parts.join(':') || undefined

    const newObj = {}
    for (const k in (obj || {})) {
      newObj[k] = obj[k]
    }
    for (const k in (newObjParts || {})) {
      newObj[k] = newObjParts[k]
    }

    return canopi(newName, newObj)
  }

  for (const level of levels) {
    /* Note: The order that the loggable object is constructed is tweaked so
     * that the most interesting properties appear first when executing under
     * Node.
     */
    canopiLogger[level] = function (a1, a2) {
      const loggable = { timestamp: canopiConfig.dateProvider().toISOString() }
      if (logName !== undefined) {
        loggable.name = logName
      }
      loggable.severity = level

      Object.assign(loggable, obj)

      try {
        if (typeof (a1) === 'string') {
          loggable.message = a1

          if (typeof (a2) === 'object') {
            Object.assign(loggable, a2)
          } else if (a2 !== undefined) {
            throw new CanopiUsageError('When logging a string message, the second argument must be an object if provided')
          }
        } else if (a1 instanceof Error) {
          // Messages and objects are logged before the error for readability.
          if (typeof (a2) === 'string') {
            loggable.message = a2
          } else if (typeof (a2) === 'object') {
            Object.assign(loggable, a2)
          } else if (a2 !== undefined) {
            throw new CanopiUsageError('When logging an error, the second argument must be a string or object if provided')
          }

          loggable.err = {
            name: a1.name,
            message: a1.message
          }
          // Log the code if we have one.
          if (a1.code) {
            loggable.err.code = a1.code
          }
          loggable.err.stack = a1.stack

          if (level === 'error') {
            for (const handler of canopiConfig.errorHandlers) {
              handler(a1)
            }
          }
        } else if (typeof (a1) === 'object') {
          if (a2 !== undefined) {
            throw new CanopiUsageError('When logging an object, there can be no other arguments')
          }
          Object.assign(loggable, a1)
        } else if (a1 === undefined) {
          throw new CanopiUsageError('Log message, object or error not provided')
        } else {
          throw new CanopiUsageError('Unsupported argument')
        }

        // Apply formatters
        for (const key in loggable) {
          if (typeof canopiConfig.formatters[key] === 'function') {
            loggable[key] = canopiConfig.formatters[key](loggable[key])
          }
        }
      } catch (err) {
        // An error occured in canopi
        loggable.severity = 'error'
        loggable.err = {
          name: err.name,
          message: err.message,
          stack: err.stack
        }
      }

      if (canopiConfig.outputStream) canopiConfig.outputStream.write(stringify(loggable) + '\n')
    }
  }

  return canopiLogger
}

/* Formatting functions */

const setFormatter = (key, formatter) => {
  canopiConfig.formatters[key] = formatter
}

const requestFormatter = (req) => {
  return {
    method: req.method,
    url: req.url,
    headers: req.headers,
    remoteAddress: req.connection.remoteAddress,
    remotePort: req.connection.remotePort
  }
}

module.exports = canopi
module.exports.setOutputStream = (stream) => {
  canopiConfig.outputStream = stream
}
module.exports.setDateProvider = (dateProvider) => {
  canopiConfig.dateProvider = dateProvider
}
module.exports.addErrorHandler = (handler) => {
  if (typeof handler !== 'function') throw new CanopiUsageError('Error handlers must be a function')
  canopiConfig.errorHandlers.push(handler)
}
module.exports.setFormatter = setFormatter
module.exports.requestFormatter = requestFormatter
module.exports.defaultFormatters = () => {
  setFormatter('req', requestFormatter)
}
module.exports.quiet = () => {
  canopiConfig.outputStream = null
  canopiConfig.errorHandlers = []
}
