const { json } = require('micro')

const { isCoinCreationValid, coinPool } = require('../../model/coin')
const { signResponse } = require('../../model/keys')

module.exports = async (request, response) => {
  try {
    const data = await json(request, { encoding: 'utf8' })
    if (await isCoinCreationValid(data)) {
      const result = await coinPool.getCoins(data.amount)
      return { success: true, result, signature: await signResponse(result) }
    }
  } catch (error) {
    // TODO: log properly
    console.error(error)
  }
  return { success: false }
}
