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

test('constructing new loggers', (t) => {
  t.plan(8)

  const l1 = canopi()
  const l2 = canopi('alpha')
  const l3 = canopi({ beta: 'gamma' })
  const l4 = canopi('alpha', { beta: 'gamma' })

  t.equals(l1.logName, undefined)
  t.deepEquals(l1.obj, {})

  t.equals(l2.logName, 'alpha')
  t.deepEquals(l2.obj, {})

  t.equals(l3.logName, undefined)
  t.deepEquals(l3.obj, { beta: 'gamma' })

  t.equals(l4.logName, 'alpha')
  t.deepEquals(l4.obj, { beta: 'gamma' })
})

test('child loggers', (t) => {
  t.plan(6)

  const l1 = canopi('alpha')
  const l2 = l1('beta')
  const l3 = l2('gamma')
  const l4 = l3({ delta: 'epsilon' })
  const l5 = l4({ delta: 'zeta' })
  const l6 = l5({ eta: 'theta' })

  t.equals(l2.logName, 'alpha:beta')
  t.equals(l3.logName, 'alpha:beta:gamma')
  t.equals(l4.logName, 'alpha:beta:gamma')
  t.deepEquals(l4.obj, { delta: 'epsilon' })
  t.deepEquals(l5.obj, { delta: 'zeta' })
  t.deepEquals(l6.obj, { delta: 'zeta', eta: 'theta' })
})

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
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"info","err":{"name":"CanopiUsageError","message":"When logging a string message, the second argument must be an object if provided","stack":"STACK"}}\n')
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
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"info","err":{"name":"CanopiUsageError","message":"When logging an object, there can be no other arguments","stack":"STACK"}}\n')
  b.reset()
})

test('log name', (t) => {
  t.plan(1)
  const log = canopi('logName')
  const b = bufferingWritable()
  canopi.setOutputStream(b)

  log.info('message')
  t.equals(b.value,
    '{"timestamp":"2001-02-01T01:01:01.001Z","name":"logName","severity":"info","message":"message"}\n')
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
  t.plan(1)
  canopi.quiet()
  const log = canopi()
  const err = new Error('an error')

  const handler = (_err) => {
    t.equals(_err, err, 'same error')
  }
  canopi.addErrorHandler(handler)

  log.error(err)
  canopi.quiet()
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
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"info","err":{"name":"CanopiUsageError","message":"Log message, object or error not provided","stack":"STACK"}}\n')
  b.reset()

  log.info(1)
  t.equals(b.value.replace(/("stack":")CanopiUsageError:[^"]+/, '$1STACK'),
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"info","err":{"name":"CanopiUsageError","message":"Unsupported argument","stack":"STACK"}}\n')
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
