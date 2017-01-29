const test = require('tape-catch')

const canopy = require('./canopy')

test('constructing new loggers', (t) => {
  t.plan(8)

  const l1 = canopy()
  const l2 = canopy('alpha')
  const l3 = canopy({ beta: 'gamma' })
  const l4 = canopy('alpha', { beta: 'gamma' })

  t.equals(l1.name, undefined)
  t.deepEquals(l1.obj, {})

  t.equals(l2.name, 'alpha')
  t.deepEquals(l2.obj, {})

  t.equals(l3.name, undefined)
  t.deepEquals(l3.obj, { beta: 'gamma' })

  t.equals(l4.name, 'alpha')
  t.deepEquals(l4.obj, { beta: 'gamma' })
})
