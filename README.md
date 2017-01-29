# Canopy [ ![Codeship Status for robhaswell/canopy](https://app.codeship.com/projects/49893e50-c891-0134-6fb0-6ac8e955f005/status?branch=master)](https://app.codeship.com/projects/199046)
🌴 A simple Node logging library for the cloud

## Motivation

Canopy was created to support the logging needs of a microservices application deployed to Google Container Engine.
In order to effectively debug a distributed application, it is required to be able to trace logs which relate to a given request, event or entity.
This means that every log message needs to have some sort of context to be useful, usually supplied an object of relevant properties and values.
Additionally, there is no requirement for alternative logging streams or level-based filtering, as logs are processed by log collection tooling.

Other logging solutions such as [Bole](https://github.com/rvagg/canopy) or [Bunyan](https://github.com/trentm/node-bunyan) make it difficult to log errors with some context, or are overly burdened with unnecessary functionality, so we created Canopy.

The API for Canopy is heavily inspired by Bole.

## API

### canopy('name')

Create a new **logger** with the supplied `name` to be attached to each output.
If you keep a logger-per module you don't need to pass loggers around, *keep your concerns separated*.

### canopy({ aProperty: 'aValue'})

Create a new **logger** with the fields from the supplied object included in the output.

### canopy('name', { aProperty: 'aValue'})

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

**Note:** Any other call signature will throw a `TypeError`.

### logger()

The `logger` object returned by `canopy()` is also a function that accepts a `name` or `object` argument.
It returns a new logger whose name is the parent logger with the new name appended after a `':'` character.
This is useful for splitting a logger up for grouping events.
Consider the HTTP server case where you may want to group all events from a particular request together:

```js
var log = canopy('server')

http.createServer(function (req, res) {
  req.log = log(uuid.v4()) // make a new sub-logger
  req.log.info(req)

  //...

  // log an error against this sub-logger
  req.log.error(err)
})
```

