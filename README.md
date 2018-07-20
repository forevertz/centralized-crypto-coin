# Centralized crypto coin

This project can be used to create a virtual currency with the following properties:

- **centralized**: no consensus mecanism, no transaction fees.
- **secured with cryptography**: based on ECDSA NIST P-256 (which is compatible with all recent browsers).
- **privacy centered**: even with a full database access, it's impossible to know who owns what.

<a href="https://github.com/forevertz/centralized-crypto-coin/blob/master/LICENSE"><img alt="license" src="https://img.shields.io/badge/license-MIT_License-blue.svg?style=flat" /></a>

## Concepts

- In the database, we have a list of coinIds associated with a public key.
- These coins have a fixed facial value (modulo of their identifier, see [code](https://github.com/forevertz/centralized-crypto-coin/blob/master/src/model/coin.js#L11-L13)).
- Whoever possess the private key associated with the coin can sign a message to allow its transfer to another public key.

=> Coins have the **same properties as the cash** for privacy!
Drawback: users have to store their own private keys (one for each coin).

## Getting started

### Development

```shell
$ git clone https://github.com/forevertz/centralized-crypto-coin.git
$ cd centralized-crypto-coin
$ yarn run dev
```

### Production

```shell
$ git clone https://github.com/forevertz/centralized-crypto-coin.git
$ cd centralized-crypto-coin
$ docker-compose up -d
# Recommended: install an SSL certificate and allow only https
# Then go to https://yourhost:3001/keys/init and save the control key in a safe storage
# Your public API is now running on https://yourhost:3000
```

## API

### Admin API

#### Authentication

For **POST** requests, headers must include:

- `X-Public-Key`: compressed base64 public key associated with the control private key (generated with `/keys/init`)
- `X-Signature`: `BASE64(SIGN(SHA256(POST payload)))`
- `Content-Type`: `application/json` or `application/json; charset=utf-8`

Note: `Content-Length` is limited to 1000 code points.

#### Endpoints

- _**GET** /keys/init_: Generates initial control and response key pairs
- _**POST** /keys/control_: Set new control public key
- _**POST** /coins/create_: Create new coins

#### Examples

<details><summary>POST /keys/control</summary><p>

```javascript
const ECDSA = require('ecdsa-secp256r1')
;(async function() {
  const currentControlKey = await ECDSA.fromJWK({
    // use your own control key
    kty: 'EC',
    crv: 'P-256',
    x: '4YdUIhIDncVu5tScgjxthiXOO_el11FWb56gR3qnhVQ',
    y: 'UyEvWOJbMZa9PtggGeRC9iQcAzOZZsyXpFE1qaF6jFk',
    d: 'TYVI2fW-nHSPGCx0MhWasg2Ggiyl1E_Kq4D1A5LmkxU'
  })
  const newControlKey = await ECDSA.generateKey()

  const message = JSON.stringify({
    newPublicKey: await newControlKey.toBase64CompressedPublicKey()
  })
  try {
    const response = await fetch('https://yourdomain:3001/keys/control', {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        'X-Public-Key': await currentControlKey.toBase64CompressedPublicKey(),
        'X-Signature': await currentControlKey.hashAndSign(message)
      }),
      body: message
    })
    // You should save the new control key!
    console.log(await response.json())
  } catch (error) {
    console.error(error)
  }
})()
```

</p></details>

<details><summary>POST /coins/create</summary><p>

```javascript
const ECDSA = require('ecdsa-secp256r1')
;(async function() {
  const currentControlKey = await ECDSA.fromJWK({
    // use your own control key
    kty: 'EC',
    crv: 'P-256',
    x: '4YdUIhIDncVu5tScgjxthiXOO_el11FWb56gR3qnhVQ',
    y: 'UyEvWOJbMZa9PtggGeRC9iQcAzOZZsyXpFE1qaF6jFk',
    d: 'TYVI2fW-nHSPGCx0MhWasg2Ggiyl1E_Kq4D1A5LmkxU'
  })

  const message = JSON.stringify({
    amount: 24 // between 1 and 500
  })
  try {
    const response = await fetch('https://yourdomain:3001/coins/create', {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        'X-Public-Key': await currentControlKey.toBase64CompressedPublicKey(),
        'X-Signature': await currentControlKey.hashAndSign(message)
      }),
      body: message
    })
    // Save the key pairs of the created coins
    console.log(await response.json())
  } catch (error) {
    console.error(error)
  }
})()
```

</p></details>

### Public API

#### Authentication

For **POST** requests, headers must include:

- `X-Public-Key`: compressed base64 public key associated with one of user's private key
- `X-Signature`: `BASE64(SIGN(SHA256(POST payload)))`
- `Content-Type`: `application/json` or `application/json; charset=utf-8`

Note: `Content-Length` is limited to 1000 code points.

#### Endpoints

- _**GET** /doc_: List all API endpoints
- _**GET** /time_: Get server time (ISO 8601)
- _**GET** /keys/response_: Get the response compressed ECDSA public key
- _**GET** /coins/value_: Get the value of the given coins
- _**POST** /coins/transfer_: Transfer the ownership of coins by changing their public key

#### Examples

<details><summary>GET /coins/value</summary><p>

```javascript
fetch('https://yourdomain:3000/coins/value?ids=[1,2,3,4,5]')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

</p></details>

<details><summary>POST /coins/transfer</summary><p>

Let's say Alice wants to send Bob coins 3 and 9.

```javascript
# Alice
const ECDSA = require('ecdsa-secp256r1')
;(async function() {
  const aliceCoinKeys = {
    3: await ECDSA.fromJWK({ kty: 'EC', crv: 'P-256' /* ... coin 3 current private key */ }),
    9: await ECDSA.fromJWK({ kty: 'EC', crv: 'P-256' /* ... coin 9 current private key */ })
  }
  const signForTransfer = async (coinId, privateKey, timestamp) => {
    const publicKey = await privateKey.toBase64CompressedPublicKey()
    return privateKey.hashAndSign(`${coinId}-${publicKey}-${timestamp}`)
  }
  const now = Math.floor(Date.now() / 1000)
  const messageToBob = [
    { coinId: 3, timestamp: now - 1, signature: await signForTransfer(3, aliceCoinKeys[3], now - 1) },
    { coinId: 9, timestamp: now + 2, signature: await signForTransfer(9, aliceCoinKeys[9], now + 2) }
  ]
  /*
    Send message to Bob!

    Note: timestamps can be scrambled to improve privacy, but server will only accept them
    if they have less than 2 minutes difference with its current time.
  */
})()
```

```javascript
# Bob
const ECDSA = require('ecdsa-secp256r1')
;(async function(messageFromAlice) {
  const randomKey = await ECDSA.generateKey() // does not really matter which key Bob uses

  const message = JSON.stringify(
    messageFromAlice.map(({ coinId, timestamp, signature }) => {
      const newPrivateKey = await ECDSA.generateKey()
      // You should save the new private key associated with the coinId!
      const newPublicKey = await newPrivateKey.toBase64CompressedPublicKey()
      return { coinId, timestamp, signature, newPublicKey }
    })
  )
  try {
    const response = await fetch('https://yourdomain:3000/coins/transfer', {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        'X-Public-Key': await randomKey.toBase64CompressedPublicKey(),
        'X-Signature': await randomKey.hashAndSign(message)
      }),
      body: message
    })
    console.log(await response.json())
  } catch (error) {
    console.error(error)
  }
})()
```

</p></details>
