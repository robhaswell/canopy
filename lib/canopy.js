const canopy = function (a1, a2) {
  this.name = this.name || undefined
  this.obj = this.obj || {}

  let newNamePart
  let newObj = {}

  if (a1 === undefined && a2 === undefined) {
    return this
  } else if (a2 === undefined) {
    if (typeof (a1) === 'string') {
      // canopy('name')
      newNamePart = a1
    } else if (typeof (a1) === 'object') {
      // canopy({ aProperty: aValue })
      newObj = a1
    } else {
      throw new Error('Argument must be a name or object', a1)
    }
  } else {
    if (typeof (a1) !== 'string') {
      throw new Error('When providing two arguments, first argument must be a string')
    }
    if (typeof (a2) !== 'object') {
      throw new Error('When providing two arguments, second argument must be an object')
    }
    newNamePart = a1
    newObj = a2
  }

  const newName = this.name ? `${this.name}:${newNamePart}` : newNamePart
  for (const k in (this.obj || {})) {
    newObj[k] = this.obj[k]
  }

  const newCanopy = new canopy()
  newCanopy.name = newName
  newCanopy.obj = newObj
  return newCanopy
}

module.exports = canopy
