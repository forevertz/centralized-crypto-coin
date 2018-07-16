const { initKeys } = require('../../model/keys')

module.exports = async () => {
  try {
    const { controlKey } = await initKeys()
    return { success: true, result: controlKey }
  } catch (error) {
    // TODO: log properly
    console.error(error)
  }
  return { success: false }
}
