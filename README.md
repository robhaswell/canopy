# Canopi [ ![Codeship Status for robhaswell/canopi](https://app.codeship.com/projects/49893e50-c891-0134-6fb0-6ac8e955f005/status?branch=master)](https://app.codeship.com/projects/199046)
🌴 A simple Node logging library for the cloud

```js
const log = canopi('app')
log.setOutputStream(process.stdout)

log.info('something happened', { thing: value })
// {"timestamp":"...","name":"app","message":"something happened","thing":value}

const eventLog = log('events')
log.info({ kind: 'createWidget', widget: widget })
// {"timestamp":"...","name":"app:events","kind":"createWidget","widget":widget}

const widgetLog = eventLog({ widget: widget })
log.error(new Error(), { kind: 'widgetFailed' })
// {"timestamp":"...","name":"app:events","kind":"widgetFailed","widget":widget,"err":{ name, message, [code], stack }}

canopi.addErrorHandler((err) => { errors.report(err) })
// Call `errors.report` with any logged `log.<level>(err)`
```

## Motivation

Canopi was created to support the logging needs of a microservices application deployed to Google Container Engine.
In order to effectively debug a distributed application, it is required to be able to trace logs which relate to a given request, event or entity.
This means that every log message needs to have some sort of context to be useful, usually supplied an object of relevant properties and values.
Additionally, there is no requirement for alternative logging streams or level-based filtering, as logs are processed by log collection tooling.

Other logging solutions such as [Bole](https://github.com/rvagg/canopi) or [Bunyan](https://github.com/trentm/node-bunyan) make it difficult to log errors with some context, or are overly burdened with unnecessary functionality, so we created Canopi.

The API for Canopi is heavily inspired by Bole.

## API

### canopi('name')

Create a new **logger** with the supplied `name` to be attached to each output.
If you keep a logger-per module you don't need to pass loggers around, *keep your concerns separated*.

### canopi.setOutputStream(process.stdout)

Configure the output stream.

### canopi({ aProperty: 'aValue'})

Create a new **logger** with the fields from the supplied object included in the output.

### canopi('name', { aProperty: 'aValue'})

Create a new **logger** with the supplied `name` and fields to be included in the output.

### logger#debug(), logger#info(), logger#warn(), logger#error()

Loggers have 4 roughly identical log methods, one for each of the supports log-levels.
Log levels are recorded on the output and can be used to determine the level of detail passed to the output.

Log methods support the following types of input:

#### logger.\<level\>('message')

Providing a message string will output the message under the property `message`.
No substitution is performed.

#### logger.\<level\>("message", { an: 'object' })

If an object is provided with a message, the behaviour is as above but with additional properties from the object included in the output.

#### logger.\<level\>({ an: 'object' })

Providing an object will log all the fields of the object.

#### logger.\<level\>(err)

**`Error` objects**: log output will include the error `name`, `message`, complete `stack` and also a `code` where there is one.

#### logger.\<level\>(err, { an: 'object' })

The error will be logged as above, but with additional properties from the object included in the output.

#### logger.\<level\>(err, 'message')

The error will be logged as above, but with the additional `message` property.

**Note:** Any other call signature will log a `CanopiUsageError` at the requested log level.

### logger()

The `logger` object returned by `canopi()` is also a function that accepts a `name` or `object` argument.
It returns a new logger whose name is the parent logger with the new name appended after a `':'` character.
This is useful for splitting a logger up for grouping events.
Consider the HTTP server case where you may want to group all events from a particular request together:

```js
var log = canopi('server')

http.createServer(function (req, res) {
  req.log = log(uuid.v4()) // make a new sub-logger
  req.log.info(req)

  //...

  // log an error against this sub-logger
  req.log.error(err)
})
```

## Formatters

Canopi supports _formatters_, which are convenience functions the user can defined which format unweildy objects.
A formatting function takes two arguments, a _key_ and a function.
The function will be called with the value of the _key_ if anything is logged under that _key_.

```js
canopi.setFormatter('upper', (value) => value.toUpperCase())
log.info({ upper: 'make me uppercase' })
// {"timestamp":"...","upper":"MAKE ME UPPERCASE"}

canopi.setFormatter('upper', null)
log.info({ upper: 'make me uppercase' })
// {"timestamp":"...","upper":"make me uppercase"}
```

A default formatter for `request` objects is available as `canopi.requestFormatter`.
This can also be set (along with others in the future) with `canopi.defaultFormatters()`.

Formatters are not chainable .

## Error handlers

Canopi supports a list of error handlers which are called in turn with each error logged.
Errors are only handled if they are the first argument to a log method.

#### canopi.addErrorHandler(function callback(err) { ... })

Call `callback` with a single argument of the error instance whenever an error is logged as the first argument to a log method.

## Other methods

### canopi.quiet()

Silence the logger output by preventing it from writing to `process.stdout` and removing any error handlers.
