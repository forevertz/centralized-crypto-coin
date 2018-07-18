const ECDSA = require('ecdsa-secp256r1')

const { get, set, getKeys, lockKeys, unlockKeys, updateAll } = require('../service/database')
const { isBase64 } = require('../service/validator')
const { sleep } = require('../service/util')

const COIN_VALUES = [1, 1, 2, 3, 5, 8, 13]
const COIN_POOL_SIZE = 1000
const MINUTE = 60

function getCoinValue (coinId) {
  return COIN_VALUES[parseInt(coinId) % COIN_VALUES.length]
}

const coinPool = (function CoinPool (size) {
  const pools = COIN_VALUES.reduce((acc, value) => ({ ...acc, [value]: [] }), {})

  function getMinPoolLength () {
    return Object.values(pools).reduce((min, pool) => Math.min(min, pool.length), size)
  }

  async function replenish () {
    const minPoolLength = getMinPoolLength()
    if (minPoolLength >= size / COIN_VALUES.length) return
    try {
      if (await lockKeys(['coinCreation'], 1 * MINUTE)) {
        let lastCoinId = (await get('meta:lastCoinId')) || 0
        const coinNumber = Math.ceil(size / COIN_VALUES.length - minPoolLength) * COIN_VALUES.length
        for (let i = 0; i < coinNumber; i++) {
          const key = ECDSA.generateKey()
          const coinId = ++lastCoinId
          pools[getCoinValue(coinId)].push({
            coinId,
            public: key.toCompressedPublicKey(),
            private: key.toJWK()
          })
        }
        await set('meta:lastCoinId', lastCoinId)
        await unlockKeys(['coinCreation'])
      } else {
        await sleep(500)
        return replenish()
      }
    } catch (error) {
      console.error(error)
    }
  }

  async function getCoins (amount) {
    const coins = []
    let sum = 0
    while (sum < amount) {
      const remaining = amount - sum
      const coinValue =
        remaining >= COIN_VALUES[COIN_VALUES.length - 1]
          ? COIN_VALUES[COIN_VALUES.length - 1]
          : COIN_VALUES[COIN_VALUES.findIndex(value => value > remaining) - 1]
      const coin = pools[coinValue].shift()
      if (coin !== undefined) {
        coins.push(coin)
        sum += coinValue
      } else {
        await replenish()
      }
    }
    replenish()
    return coins
  }

  return {
    replenish,
    getCoins
  }
})(COIN_POOL_SIZE)

async function isCoinCreationValid (data) {
  // data should be an object
  if (typeof data !== 'object') {
    return false
  }
  const { amount } = data
  // amount is required and should be an integer
  if (amount === undefined || !Number.isInteger(amount) || amount <= 0 || amount > 500) {
    return false
  }
  return true
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
  isCoinCreationValid,
  isCoinTransferValid,
  lockCoins,
  transferCoins,
  unlockCoins,
  coinPool
}
