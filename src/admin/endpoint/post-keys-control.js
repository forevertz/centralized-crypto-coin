const { json } = require('micro')

const { isNewPublicControlKeyValid, setControlKey } = require('../../model/keys')

module.exports = async request => {
  try {
    const data = await json(request, { encoding: 'utf8' })
    if (isNewPublicControlKeyValid(data)) {
      await setControlKey(data.newPublicKey)
      return { success: true }
    }
  } catch (error) {
    // TODO: log properly
    console.error(error)
  }
  return { success: false }
}
