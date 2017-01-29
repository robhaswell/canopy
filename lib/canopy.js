const callable = require('callable-object')
const individual = require('individual')
const levels = ['debug', 'info', 'warn', 'error']

var outputStream = individual('__CANOPY_OUTPUT_STREAM', process.stdout)

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

function Canopy (a1, a2) {
  [this.logName, this.obj] = _parseArgs(a1, a2)
}

Canopy.prototype.__call__ = function (a1, a2) {
  const [newNamePart, newObjParts] = _parseArgs(a1, a2)

  const parts = [ this.logName, newNamePart ].filter(Boolean)
  const newName = parts.join(':') || undefined

  const newObj = {}
  for (const k in (this.obj || {})) {
    newObj[k] = this.obj[k]
  }
  for (const k in (newObjParts || {})) {
    newObj[k] = newObjParts[k]
  }

  return callable(Canopy, newName, newObj)
}

for (const level of levels) {
  /* Note: The order that the loggable object is constructed is tweaked so
   * that the most interesting properties appear first when executing under
   * Node.
   */
  Canopy.prototype[level] = function (a1, a2) {
    const loggable = { timestamp: this._date().toISOString() }
    if (this.logName !== undefined) {
      loggable.name = this.logName
    }
    loggable.severity = level

    if (typeof(a1) === 'string') {
      loggable.message = a1

      if (typeof(a2) === 'object') {
        for (const k in a2) {
          loggable[k] = a2[k]
        }
      } else if (a2 !== undefined) {
        throw new TypeError('When logging a string message, the second argument must be an obejct if provided')
      }
    } else if (a1 instanceof Error) {
      // Messages and objects are logegd before the error for readability.
      if (typeof(a2) === 'string') {
        loggable.message = a2
      } else if (typeof(a2) === 'object') {
        for (const k in a2) {
          loggable[k] = a2[k]
        }
      } else if (a2 !== undefined) {
        throw new TypeError('When logging an error, the second argument must be a string or object if provided')
      }

      loggable.err = {
        name: a1.name,
        message: a1.message,
      }
      // Log the code if we have one.
      if (a1.code) {
        loggable.err.code = a1.code
      }
      loggable.err.stack = a1.stack
    } else if (typeof(a1) === 'object') {
      if (a2 !== undefined) {
        throw new TypeError('When logging an object, there can be no other arguments')
      }
      for (const k in a1) {
        loggable[k] = a1[k]
      }
    } else if (a1 === undefined) {
      throw new TypeError('Log message, object or error not provided')
    } else {
      throw new TypeError('Unsupported argument')
    }

    outputStream.write(JSON.stringify(loggable) + '\n')
  }
}

Canopy.prototype._date = () => {
  return new Date()
}

module.exports = callable(Canopy)
module.exports.setOutputStream = (stream) => {
  outputStream = stream
}
module.exports.setDateGetter = (dateGetter) => {
  Canopy.prototype._date = dateGetter
}
