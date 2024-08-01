import common from './common.js'

test('test function: _defaults()', () => {
  const object = { a: 1 }
  const result = common._defaults(object, { a: 3, b: 2 })
  expect(result.a).toBe(1)
  expect(result.b).toBe(2)
})
