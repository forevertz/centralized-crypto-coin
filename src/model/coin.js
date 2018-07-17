const ECDSA = require('ecdsa-secp256r1')

const { getKeys, lockKeys, unlockKeys, updateAll } = require('../service/database')
const { isBase64 } = require('../service/validator')

const COIN_VALUES = [1, 1, 2, 3, 5, 8, 13]

function getCoinValue (coinId) {
  return COIN_VALUES[parseInt(coinId) % COIN_VALUES.length]
}

async function isCoinTransferValid (data, expireSeconds) {
  // data should be an array
  if (!Array.isArray(data) || !data.length) {
    return false
  }
  for (const coinTransfer of data) {
    const { coinId, timestamp, signature, newPublicKey } = coinTransfer
    // coinId is required and should be an integer
    if (coinId === undefined || !Number.isInteger(coinId)) {
      return false
    }
    // timestamp is required and should be an integer (timestamp in seconds)
    const isAlmostNow = value => Math.abs(Date.now() / 1000 - value) < expireSeconds
    if (timestamp === undefined || !Number.isInteger(timestamp) || !isAlmostNow(timestamp)) {
      return false
    }
    // signature is required and should be a base64 encoded string
    if (signature === undefined || !isBase64(signature) || signature.length !== 88) {
      return false
    }
    // newPublicKey is required and should be a base64 encoded string
    if (newPublicKey === undefined || !isBase64(newPublicKey) || newPublicKey.length !== 44) {
      return false
    }
  }

  // Verify signatures
  try {
    const publicKeys = await getKeys(data.map(({ coinId }) => coinId))
    for (let i = 0, l = publicKeys.length; i < l; i++) {
      const currentPublicKey = publicKeys[i]
      const { coinId, timestamp, signature, newPublicKey } = data[i]
      const key = ECDSA.fromCompressedPublicKey(currentPublicKey)
      ECDSA.fromCompressedPublicKey(newPublicKey)
      if (!(await key.hashAndVerify(`${coinId}-${currentPublicKey}-${timestamp}`, signature))) {
        return false
      }
    }
  } catch (error) {
    return false
  }

  return true
}

function lockCoins (data, expireSeconds) {
  return lockKeys(data.map(({ coinId }) => coinId), expireSeconds)
}

async function unlockCoins (data) {
  return unlockKeys(data.map(({ coinId }) => coinId))
}

async function transferCoins (data) {
  const coins = data.reduce(
    (acc, { coinId, newPublicKey }) => ({ ...acc, [coinId]: newPublicKey }),
    {}
  )
  await updateAll(coins)
  return coins
}

module.exports = {
  getCoinValue,
  isCoinTransferValid,
  lockCoins,
  transferCoins,
  unlockCoins
}
