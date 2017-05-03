const test = require('tape-catch')
const Writable = require('stream').Writable

const canopi = require('./canopi')

canopi.setDateProvider(() => {
  return new Date(2001, 1, 1, 1, 1, 1, 1)
})

const bufferingWritable = () => {
  const w = new Writable()
  w.value = ''
  w._write = function (chunk, enc, next) {
    this.value += chunk
    next()
  }
  w.reset = function () {
    this.value = ''
  }
  return w
}

test('simple logging', (t) => {
  t.plan(4)
  const log = canopi()
  const b = bufferingWritable()
  canopi.setOutputStream(b)

  log.debug('message')
  t.equals(b.value,
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"debug","message":"message"}\n')
  b.reset()

  log.info('message')
  t.equals(b.value,
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"info","message":"message"}\n')
  b.reset()

  log.warn('message')
  t.equals(b.value,
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"warn","message":"message"}\n')
  b.reset()

  log.error('message')
  t.equals(b.value,
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"error","message":"message"}\n')
  b.reset()
})

test('logging messages and objects', (t) => {
  t.plan(2)
  const log = canopi()
  const b = bufferingWritable()
  canopi.setOutputStream(b)

  log.info('message', { alpha: 'beta' })
  t.equals(b.value,
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"info","message":"message","alpha":"beta"}\n')
  b.reset()

  log.info('message', 'invalid')
  t.equals(b.value.replace(/("stack":")CanopiUsageError:[^"]+/, '$1STACK'),
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"error","message":"message","err":{"name":"CanopiUsageError","message":"When logging a string message, the second argument must be an object if provided","stack":"STACK"}}\n')
  b.reset()
})

test('logging objects', (t) => {
  t.plan(2)
  const log = canopi()
  const b = bufferingWritable()
  canopi.setOutputStream(b)

  log.info({ alpha: 'beta' })
  t.equals(b.value,
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"info","alpha":"beta"}\n')
  b.reset()

  log.info({ alpha: 'beta' }, 'invalid')
  t.equals(b.value.replace(/("stack":")CanopiUsageError:[^"]+/, '$1STACK'),
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"error","err":{"name":"CanopiUsageError","message":"When logging an object, there can be no other arguments","stack":"STACK"}}\n')
  b.reset()
})

test('log name', (t) => {
  t.plan(2)
  const log = canopi('logName')
  const b = bufferingWritable()
  canopi.setOutputStream(b)

  log.info('message')
  t.equals(b.value,
    '{"timestamp":"2001-02-01T01:01:01.001Z","name":"logName","severity":"info","message":"message"}\n')
  b.reset()

  log('subName').info('message')
  t.equals(b.value,
    '{"timestamp":"2001-02-01T01:01:01.001Z","name":"logName:subName","severity":"info","message":"message"}\n')
  b.reset()
})

test('binding objects', (t) => {
  t.plan(2)
  const log = canopi({ alpha: 'alpha' })
  const b = bufferingWritable()
  canopi.setOutputStream(b)

  log.info({ beta: 'beta' })
  t.equals(b.value,
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"info","alpha":"alpha","beta":"beta"}\n')
  b.reset()

  log({ beta: 'beta' }).info({ gamma: 'gamma' })
  t.equals(b.value,
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"info","alpha":"alpha","beta":"beta","gamma":"gamma"}\n')
  b.reset()
})

test('logging errors', (t) => {
  t.plan(5)
  const log = canopi()
  const b = bufferingWritable()
  canopi.setOutputStream(b)

  const err = new Error('an error')

  log.error(err)
  t.equals(b.value.replace(/("stack":")Error:[^"]+/, '$1STACK'),
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"error","err":{"name":"Error","message":"an error","stack":"STACK"}}\n')
  b.reset()

  log.error(err, 'a message')
  t.equals(b.value.replace(/("stack":")Error:[^"]+/, '$1STACK'),
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"error","message":"a message","err":{"name":"Error","message":"an error","stack":"STACK"}}\n')
  b.reset()

  log.error(err, { alpha: 'beta' })
  t.equals(b.value.replace(/("stack":")Error:[^"]+/, '$1STACK'),
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"error","alpha":"beta","err":{"name":"Error","message":"an error","stack":"STACK"}}\n')
  b.reset()

  err.code = 500
  log.error(err)
  t.equals(b.value.replace(/("stack":")Error:[^"]+/, '$1STACK'),
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"error","err":{"name":"Error","message":"an error","code":500,"stack":"STACK"}}\n')
  b.reset()

  log.error(err, 1)
  t.equals(b.value.replace(/("stack":")CanopiUsageError:[^"]+/, '$1STACK'),
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"error","err":{"name":"CanopiUsageError","message":"When logging an error, the second argument must be a string or object if provided","stack":"STACK"}}\n')
  b.reset()
})

test('error handlers', (t) => {
  t.plan(2)
  const log = canopi()
  const err = new Error('an error')

  const handler = (_err) => {
    t.equals(_err, err, 'same error')
  }
  canopi.addErrorHandler(handler)
  log.warn(err) // not passed to the error handler.
  log.error(err)

  t.throws(() => { canopi.addErrorHandler(null) }, /CanopiUsageError/)
})

test('unsupported uses', (t) => {
  t.plan(5)
  const log = canopi()
  const b = bufferingWritable()
  canopi.setOutputStream(b)

  t.throws(() => { canopi({}, {}) }, TypeError)
  t.throws(() => { canopi('', '') }, TypeError)
  t.throws(() => { canopi(1) }, TypeError)

  log.info()
  t.equals(b.value.replace(/("stack":")CanopiUsageError:[^"]+/, '$1STACK'),
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"error","err":{"name":"CanopiUsageError","message":"Log message, object or error not provided","stack":"STACK"}}\n')
  b.reset()

  log.info(1)
  t.equals(b.value.replace(/("stack":")CanopiUsageError:[^"]+/, '$1STACK'),
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"error","err":{"name":"CanopiUsageError","message":"Unsupported argument","stack":"STACK"}}\n')
  b.reset()
})

test('circular structures', (t) => {
  t.plan(1)
  const log = canopi()
  const b = bufferingWritable()
  canopi.setOutputStream(b)
  const circ1 = {}
  const circ2 = { circ1 }
  circ1.circ2 = { circ2 }
  t.doesNotThrow(() => log.info(circ1))
})

test('formatters', (t) => {
  t.plan(3)
  const log = canopi()
  const b = bufferingWritable()
  canopi.setOutputStream(b)
  canopi.defaultFormatters()

  canopi.setFormatter('upper', (value) => value.toUpperCase())
  log.info({ upper: 'make me uppercase' })
  t.equals(b.value,
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"info","upper":"MAKE ME UPPERCASE"}\n')
  b.reset()

  canopi.setFormatter('upper', null)
  log.info({ upper: 'make me uppercase' })
  t.equals(b.value,
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"info","upper":"make me uppercase"}\n')
  b.reset()

  const req = {
    method: 'GET',
    url: 'https://alpha/beta',
    headers: {},
    connection: {
      remoteAddress: '1.2.3.4',
      remotePort: '1234'
    },
    anotherValue: 'not interested'
  }

  log.info({ req })
  t.equals(b.value,
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"info","req":{"method":"GET","url":"https://alpha/beta","headers":{},"remoteAddress":"1.2.3.4","remotePort":"1234"}}\n')
  b.reset()
})
