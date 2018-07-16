const { json } = require('micro')

const { isCoinTransferValid, transferCoins } = require('../model/coin')
const { getPrivateResponseKey } = require('../model/keys')

module.exports = async (request, response) => {
  try {
    const data = await json(request, { encoding: 'utf8' })
    if (await isCoinTransferValid(data)) {
      const result = await transferCoins(data)
      const key = await getPrivateResponseKey()
      const signature = await key.hashAndSign(result)
      return { success: true, result, signature }
    }
  } catch (error) {
    // TODO: log properly
    console.error(error)
  }
  return { success: false }
}
