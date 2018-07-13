const { send } = require('micro')

const { getCoinValue } = require('../model/coin')

function parseQueryString (queryString) {
  return queryString.split('&').reduce(
    (params, paramString) => ({
      ...params,
      [paramString.split('=')[0]]: paramString
        .split('=')
        .slice(1)
        .join('')
    }),
    {}
  )
}

module.exports = async (request, response) => {
  try {
    const params = parseQueryString(request.url.split('?')[1] || '')
    const value =
      params && params.ids && /^\[\d+(,\d+)*\]$/.test(params.ids)
        ? JSON.parse(params.ids).reduce((total, coinId) => total + getCoinValue(coinId), 0)
        : 0
    return { success: true, result: value }
  } catch (error) {
    send(response, 500, { success: false, error: error.message })
  }
}
