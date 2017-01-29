const test = require('tape-catch')
const Writable = require('stream').Writable

const canopy = require('./canopy')

canopy.setDateGetter(() => {
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

  const l1 = canopy()
  const l2 = canopy('alpha')
  const l3 = canopy({ beta: 'gamma' })
  const l4 = canopy('alpha', { beta: 'gamma' })

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

  const l1 = canopy('alpha')
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
  const log = canopy()
  const b = bufferingWritable()
  canopy.setOutputStream(b)

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
  const log = canopy()
  const b = bufferingWritable()
  canopy.setOutputStream(b)

  log.info('message', { alpha: 'beta' })
  t.equals(b.value,
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"info","message":"message","alpha":"beta"}\n')
  b.reset()

  t.throws(() => { log.info('message', 'invalid') }, TypeError)
})

test('logging objects', (t) => {
  t.plan(2)
  const log = canopy()
  const b = bufferingWritable()
  canopy.setOutputStream(b)

  log.info({ alpha: 'beta' })
  t.equals(b.value,
    '{"timestamp":"2001-02-01T01:01:01.001Z","severity":"info","alpha":"beta"}\n')
  b.reset()

  t.throws(() => { log.info({ alpha: 'beta' }, 'invalid') }, TypeError)
})

test('log name', (t) => {
  t.plan(1)
  const log = canopy('logName')
  const b = bufferingWritable()
  canopy.setOutputStream(b)

  log.info('message')
  t.equals(b.value,
    '{"timestamp":"2001-02-01T01:01:01.001Z","name":"logName","severity":"info","message":"message"}\n')
  b.reset()
})

test('logging errors', (t) => {
  t.plan(5)
  const log = canopy()
  const b = bufferingWritable()
  canopy.setOutputStream(b)

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

  t.throws(() => { log.error(err, 1) }, TypeError)
})

test('unsupported uses', (t) => {
  t.plan(5)
  const log = canopy()
  const b = bufferingWritable()
  canopy.setOutputStream(b)

  t.throws(() => { canopy({}, {}) }, TypeError)
  t.throws(() => { canopy('', '') }, TypeError)
  t.throws(() => { canopy(1) }, TypeError)
  t.throws(() => { log.info() }, TypeError)
  t.throws(() => { log.info(1) }, TypeError)
})

