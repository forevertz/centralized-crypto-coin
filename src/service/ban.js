const { get, insert } = require('./database')

function ban (ip, expireSeconds) {
  return insert(`ban:${ip}`, true, ['EX', expireSeconds])
}

async function isBanned (ip) {
  return (await get(`ban:${ip}`)) !== null
}

module.exports = {
  ban,
  isBanned
}
