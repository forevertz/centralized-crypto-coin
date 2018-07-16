const { send } = require('micro')

const { getPrivateResponseKey } = require('../model/keys')

module.exports = async (request, response) => {
  try {
    const key = await getPrivateResponseKey()
    return { success: true, result: key.toCompressedPublicKey() }
  } catch (error) {
    send(response, 500, { success: false, error: error.message })
  }
}
