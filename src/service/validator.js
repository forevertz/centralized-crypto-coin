function isBase64 (value) {
  return typeof value === 'string' && /^[A-Za-z0-9+/=]*$/.test(value)
}

module.exports = {
  isBase64
}
