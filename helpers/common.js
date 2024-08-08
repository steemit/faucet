export function _defaults(obj, ...sources) {
  sources.forEach((source) => {
    Object.keys(source).forEach((key) => {
      if (obj[key] === undefined) {
        obj[key] = source[key]
      }
    })
  })
  return obj
}

const common = {
  _defaults,
}

export default common
