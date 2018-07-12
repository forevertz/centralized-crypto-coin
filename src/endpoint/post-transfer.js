const { send, json } = require('micro')

module.exports = async (request, response) => {
  const data = await json(request, { encoding: 'utf8' })
  return send(response, 500, { success: false, error: 'not yet available', data })
}
