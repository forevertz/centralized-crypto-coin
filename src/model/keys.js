const ECDSA = require('ecdsa-secp256r1')

const { get, insert, update } = require('../service/database')
const { isBase64 } = require('../service/validator')

async function getPublicControlKey () {
  return ECDSA.fromJWK(JSON.parse(await get('keys:control')))
}

async function getPrivateResponseKey () {
  return ECDSA.fromJWK(JSON.parse(await get('keys:response')))
}

async function signResponse (result) {
  const key = await getPrivateResponseKey()
  return key.hashAndSign(result)
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

function isNewPublicControlKeyValid (data) {
  // data should be an object
  if (typeof data !== 'object') {
    return false
  }
  const { newPublicKey } = data
  // newPublicKey is required and should be a base64 encoded string
  if (newPublicKey === undefined || !isBase64(newPublicKey) || newPublicKey.length !== 44) {
    return false
  }
  return true
}

async function setControlKey (compressedKey) {
  const key = ECDSA.fromCompressedPublicKey(compressedKey)
  await update('keys:control', JSON.stringify(key.toJWK()))
}

module.exports = {
  initKeys,
  setControlKey,
  getPublicControlKey,
  getPrivateResponseKey,
  isNewPublicControlKeyValid,
  signResponse
}
