const { json } = require('micro')

const { isCoinTransferValid, lockCoins, transferCoins, unlockCoins } = require('../model/coin')
const { getPrivateResponseKey } = require('../model/keys')

const MINUTE = 60
const EXPIRATION = 2 * MINUTE

module.exports = async (request, response) => {
  try {
    const data = await json(request, { encoding: 'utf8' })
    if ((await isCoinTransferValid(data, EXPIRATION)) && (await lockCoins(data, EXPIRATION))) {
      const result = await transferCoins(data)
      await unlockCoins(data)
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
