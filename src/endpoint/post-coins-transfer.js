const { json } = require('micro')

const { isCoinTransferValid, lockCoins, transferCoins, unlockCoins } = require('../model/coin')
const { signResponse } = require('../model/keys')

const MINUTE = 60
const EXPIRATION = 2 * MINUTE

module.exports = async (request, response) => {
  try {
    const data = await json(request, { encoding: 'utf8' })
    if ((await isCoinTransferValid(data, EXPIRATION)) && (await lockCoins(data, EXPIRATION))) {
      const result = await transferCoins(data)
      await unlockCoins(data)
      return { success: true, result, signature: await signResponse(result) }
    }
  } catch (error) {
    // TODO: log properly
    console.error(error)
  }
  return { success: false }
}
