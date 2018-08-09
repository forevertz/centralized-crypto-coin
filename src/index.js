const packageInfo = require('../package.json')
const { checkRequest } = require('./checkRequest')

process.env.TZ = 'UTC'
const MAX_CONTENT_LENGTH = 1000

const endpoints = {
  MAX_CONTENT_LENGTH,
  GET: {
    '/doc': {
      description: 'List all API endpoints',
      call: () => {
        const { name, version, description, repository, license } = packageInfo
        return { name, version, description, repository, license, endpoints }
      }
    },
    '/time': {
      description: 'Get server time (ISO 8601)',
      call: require('./endpoint/get-time')
    },
    '/keys/response': {
      description: 'Get the response compressed ECDSA public key',
      call: require('./endpoint/get-keys-response')
    },
    '/coins/value': {
      description: 'Get the value of the given coins',
      params: [{ name: 'ids', type: 'Array', example: '/coins/value?ids=[1,2,3,4,5]' }],
      call: require('./endpoint/get-coins-value')
    }
  },
  POST: {
    '/coins/transfer': {
      description: 'Transfer the ownership of coins by changing their public key',
      params: [
        {
          type: 'Array',
          of: [
            { name: 'coinId', type: 'int', description: 'Identifier of the coin' },
            { name: 'timestamp', type: 'int', description: 'Current timestamp in seconds' },
            {
              name: 'signature',
              type: 'string',
              description: 'BASE64(SIGN(SHA256(coinId-currentPublicKey-timestamp)))'
            },
            { name: 'newPublicKey', type: 'string', description: 'New public key to use' }
          ]
        }
      ],
      call: require('./endpoint/post-coins-transfer')
    }
  }
}

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
    if (await checkRequest(request, response, endpoints)) {
      return endpoints[request.method][request.pathname].call(request, response)
    }
  }
}
