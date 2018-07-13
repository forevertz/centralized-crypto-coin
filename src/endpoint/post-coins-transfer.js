const { json } = require('micro')

const { isCoinTransferValid, transferCoins } = require('../model/coin')

module.exports = async (request, response) => {
  try {
    const data = await json(request, { encoding: 'utf8' })
    if (await isCoinTransferValid(data)) {
      const result = await transferCoins(data)
      // TODO: sign response
      return { success: true, result }
    }
  } catch (error) {
    // TODO: log properly
    console.error(error)
  }
  return { success: false }
}
