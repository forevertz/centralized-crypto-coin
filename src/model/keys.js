const ECDSA = require('ecdsa-secp256r1')

const { insert, get } = require('../service/database')

async function getPublicControlKey () {
  return ECDSA.fromJWK(JSON.parse(await get('keys:control')))
}

async function getPrivateResponseKey () {
  return ECDSA.fromJWK(JSON.parse(await get('keys:response')))
}

async function initKeys () {
  const generateKey = async (keyName, { storePrivateKey }) => {
    const key = ECDSA.generateKey()
    await insert(keyName, JSON.stringify(storePrivateKey ? key.toJWK() : key.asPublic().toJWK()))
    return key.toJWK()
  }
  const [controlKey, responseKey] = await Promise.all([
    generateKey('keys:control', { storePrivateKey: false }),
    generateKey('keys:response', { storePrivateKey: true })
  ])
  return { controlKey, responseKey }
}

module.exports = {
  initKeys,
  getPublicControlKey,
  getPrivateResponseKey
}
