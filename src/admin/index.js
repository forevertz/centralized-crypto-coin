const { checkRequest } = require('../checkRequest')
const MAX_CONTENT_LENGTH = 100

const endpoints = {
  MAX_CONTENT_LENGTH,
  GET: {
    '/keys/init': {
      description: 'Generates initial control and response key pairs',
      call: require('./endpoint/get-init')
    }
  }
}

module.exports = async (request, response) => {
  request.pathname = request.url.split('?')[0]
  if (await checkRequest(request, response, endpoints)) {
    return endpoints[request.method][request.pathname].call(request, response)
  }
}
