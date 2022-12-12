/* Sample Code for connecting to the V3 Secure API via Node
 *
 * With thanks to xiaojay of Niffler Wallet:
 * https://github.com/grinfans/Niffler/blob/gw3/src/shared/walletv3.js
 *
 */
import jayson from 'jayson/promise';
import crypto from 'crypto';

// Demo implementation of using `aes-256-gcm` with node.js's `crypto` lib.
const aes256gcm = (shared_secret) => {
  const ALGO = 'aes-256-gcm';

  // encrypt returns base64-encoded ciphertext
  const encrypt = (str, nonce) => {
    let key = Buffer.from(shared_secret, 'hex');
    const cipher = crypto.createCipheriv(ALGO, key, nonce);
    const enc = Buffer.concat([cipher.update(str, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([enc, tag]).toString('base64');
  };

  // decrypt decodes base64-encoded ciphertext into a utf8-encoded string
  const decrypt = (enc, nonce) => {
    //key,nonce is all buffer type; data is base64-encoded string
    let key = Buffer.from(shared_secret, 'hex');
    const data_ = Buffer.from(enc, 'base64');
    const decipher = crypto.createDecipheriv(ALGO, key, nonce);
    const len = data_.length;
    const tag = data_.slice(len - 16, len);
    const text = data_.slice(0, len - 16);
    decipher.setAuthTag(tag);
    const dec =
      decipher.update(text, 'binary', 'utf8') + decipher.final('utf8');
    return dec;
  };

  return {
    encrypt,
    decrypt,
  };
};

class JSONRequestEncrypted {
  constructor(id, method, params, host, port, api_user, api_secret) {
    this.jsonrpc = '2.0';
    this.method = method;
    this.id = id;
    this.params = params;
    const auth_header = Buffer.from(api_user + ':' + api_secret).toString(
      'base64'
    );
    this.client = jayson.client.http({
      host: host,
      port: port,
      path: '/v3/owner',
      headers: {
        Authorization: 'Basic ' + auth_header,
      },
    });
  }

  async send(key) {
    const aesCipher = aes256gcm(key);
    const nonce = new Buffer.from(crypto.randomBytes(12));
    let payload = {
      jsonrpc: '2.0',
      id: this.id,
      method: this.method,
      params: this.params,
    };
    let enc = aesCipher.encrypt(JSON.stringify(payload), nonce);
    let params = {
      nonce: nonce.toString('hex'),
      body_enc: enc,
    };
    let response = await this.client.request('encrypted_request_v3', params);

    if (response.err) {
      throw response.err;
    }

    const nonce2 = Buffer.from(response.result.Ok.nonce, 'hex');
    const data = Buffer.from(response.result.Ok.body_enc, 'base64');

    let dec = aesCipher.decrypt(data, nonce2);
    return JSON.parse(dec);
  }
}

async function initSecure(grin_host, grin_port, api_user, api_secret) {
  const auth_header = Buffer.from(api_user + ':' + api_secret).toString(
    'base64'
  );
  const client = jayson.client.http({
    host: grin_host,
    port: grin_port,
    path: '/v3/owner',
    headers: {
      Authorization: 'Basic ' + auth_header,
    },
  });

  let ecdh = crypto.createECDH('secp256k1');
  ecdh.generateKeys();
  let publicKey = ecdh.getPublicKey('hex', 'compressed');
  const params = {
    ecdh_pubkey: publicKey,
  };
  let response = await client.request('init_secure_api', params);
  if (response.err) {
    throw response.err;
  }

  return ecdh.computeSecret(response.result.Ok, 'hex', 'hex');
}

export { JSONRequestEncrypted, initSecure };
