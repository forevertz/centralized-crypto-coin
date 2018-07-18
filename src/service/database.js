const redis = require('redis')

const client = redis.createClient(process.env.REDIS)

if (process.env.NODE_ENV === 'development') {
  client.flushall()
}

function get (key) {
  return new Promise((resolve, reject) => {
    client.get(key, (error, result) => (error ? reject(error) : resolve(result)))
  })
}

function set (key, value) {
  return new Promise((resolve, reject) => {
    client.set(key, value, (error, result) => (error ? reject(error) : resolve(result)))
  })
}

function insert (key, value, options = []) {
  return new Promise((resolve, reject) => {
    // Set if not exists
    client.set(key, value, 'NX', ...options, (error, result) => {
      error
        ? reject(error)
        : result === null
          ? reject(new Error('key already exists'))
          : resolve(true)
    })
  })
}

function update (key, value) {
  return new Promise((resolve, reject) => {
    // Set only if exists
    client.set(key, value, 'XX', (error, result) => {
      error ? reject(error) : result === null ? reject(new Error('unknown key')) : resolve(true)
    })
  })
}

function updateAll (data) {
  return new Promise((resolve, reject) => {
    client
      .multi(Object.keys(data).map(key => ['SET', key, data[key], 'XX']))
      .exec((error, result) => {
        error ? reject(error) : resolve(result)
      })
  })
}

function getKeys (keys) {
  return new Promise((resolve, reject) => {
    client.multi(keys.map(key => ['GET', key])).exec((error, result) => {
      error ? reject(error) : resolve(result)
    })
  })
}

function lockKeys (keys, expireSeconds = 60) {
  return new Promise(resolve => {
    client
      // Set if not exists and expire after X secondes
      .multi(keys.map(key => ['SET', `lock:${key}`, true, 'NX', 'EX', expireSeconds]))
      .exec(async (error, result) => {
        if (error) {
          resolve(false)
        } else if (result.find(res => res === null) !== undefined) {
          await unlockKeys(
            result.reduce((acc, res, i) => [...acc, ...(res !== null ? [keys[i]] : [])], [])
          )
          resolve(false)
        } else {
          resolve(true)
        }
      })
  })
}

function unlockKeys (keys) {
  return new Promise(resolve => {
    client.multi(keys.map(key => ['DEL', `lock:${key}`])).exec((error, result) => {
      resolve(error === null)
    })
  })
}

module.exports = {
  client,
  get,
  set,
  insert,
  update,
  updateAll,
  getKeys,
  lockKeys,
  unlockKeys
}
