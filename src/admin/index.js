const { checkAdminRequest } = require('../checkRequest')
const { coinPool } = require('../model/coin')
const MAX_CONTENT_LENGTH = 100

const endpoints = {
  MAX_CONTENT_LENGTH,
  GET: {
    '/keys/init': {
      description: 'Generates initial control and response key pairs',
      call: require('./endpoint/get-init')
    }
  },
  POST: {
    '/keys/control': {
      description: 'Set new control public key',
      call: require('./endpoint/post-keys-control')
    },
    '/coins/create': {
      description: 'Create new coins',
      call: require('./endpoint/post-coins-create')
    }
  }
}

coinPool.replenish()

module.exports = async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader(
    'Access-Control-Allow-Headers',
    ['Content-Type', 'X-Public-Key', 'X-Signature'].join(', ')
  )
  if (request.method === 'OPTIONS') {
    return ''
  } else {
    request.pathname = request.url.split('?')[0]
    if (await checkAdminRequest(request, response, endpoints)) {
      return endpoints[request.method][request.pathname].call(request, response)
    }
  }
}
