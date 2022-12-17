# Mina zkApp: GRIN Payment Proof Oracle

## Introduction

For most cryptocurrencies transaction data is publicly available. There exist a set of privacy-oriented cryptocurrencies, one of them is [GRIN](https://grin.mw/) based on the Mimblewimble protocol that provides privacy and scalability simultaneously. Due to its private nature, checking payments is not trivial. For most cryptocurrencies it consists of simply checking the transaction hash using one of the public blockchain explorers, in case of GRIN it is more complicated because of lack of on-chain addresses and amounts. Long story short - neither the transaction amounts, neither the addresses are stored on chain. It is still possible to check if payment was done by exporting a [payment proof](https://docs.grin.mw/wiki/transactions/payment-proofs/) and letting a third partyverify it.

This project is an [oracle](https://docs.minaprotocol.com/zkapps/tutorials/oracle#emitting-events) that verifies such payment proofs to serve as data source for [Mina blockchain](https://minaprotocol.com/). It has been developed for the [zkIgnite Cohort0 program](https://minaprotocol.com/blog/zkignite-cohort0). Mina is another fascinating protocol that is based on [zero-knowledge technology](https://en.wikipedia.org/wiki/Non-interactive_zero-knowledge_proof) which (extremely briefly) consists of proving the existence of data instead of revealing.

An oracle is a bridge between external world and blockchain. A GRIN payment proof oracle could serve as bridge between Mina and GRIN blockchains. If community starts to run such oracles we could implement zero-knowledge smart contracts allowing to swap Mina coins and tokens against GRIN coins and vice-versa, providing GRIN with liquidity it deserves in a semi-decentralized way. Better than centralized exchanges, but less decentralized than real atomic swaps.

This project takes advantage of [wallet Owner API V3 client](https://github.com/mimblewimble/grin-wallet/blob/master/doc/samples/v3_api_node/src/index.js) by [XiaoJay](https://github.com/xiaojay).

## Instructions

### Deploying the Oracle

It comes with few scripts that will deploy it for you and generate its first key. Remember it is not like the [tutorial 7 Oracle](https://docs.minaprotocol.com/zkapps/tutorials/oracle), it does not have a hard coded key so needs an extra transaction to set it!

```sh
zk config
```

this creates an account for you. Make sure to use the faucet to fund it as explained in [tutorial 3](https://docs.minaprotocol.com/zkapps/tutorials/deploying-to-a-network).

Then run

```sh
npm run build
```

and launch the script

```sh
node build/src/main.js berkeley
```

it will show you the oracle zkApp address and signing key that was set.

### Running your signer server in dev mode

#### Setting up the GRIN wallet

Download the GRIN wallet release adequate to your system, you may either use the pre-compiled binaries [here](https://github.com/mimblewimble/grin-wallet/releases) or compile the [source-code](https://github.com/mimblewimble/grin-wallet/) yourself.

Assuming you correctly installed the wallet, you should be able to run something like

```sh
$ grin-wallet -V
grin-wallet 5.1.0
```

Create a directory for the wallet that will serve us for payment proof verification. For the example let us call it `verifier-wallet`

```sh
$ mkdir verifier-wallet
$ cd verifier-wallet
```

Now create a new GRIN wallet there

```sh
$ grin-wallet init -h
```

where `-h` stands for `here`. You may ignore the key recovery phrase and password as this wallet is not meant to hold any funds.

Now edit the `grin-wallet.toml` using your favorite text editor, for example

```sh
$ vim grin-wallet.toml
```

unless you are willing to run your own [GRIN node](https://github.com/mimblewimble/grin), I suggest you use one of the public nodes such as [grinnode.live](https://grinnode.live/) and put it in your wallet config by changing the following line to

```toml
check_node_api_http_addr = "https://grinnode.live:3413"
```

also check the Owner API secret, it is stored in `.owner_api_secret` file

```sh
$ cat .owner_api_secret
y8yG0N5OxngGqqAaCPvt
```

don't worry I made this password public because this wallet is not publicly available and holds no funds. Be careful as the file does not end with new line character.

You should be able to run your owner API by

```sh
$ grin-wallet owner_api
```

it will ask for password, after you type it (or just hit enter if no password) the API will start running on port `3420`.

#### Setting up the server

Install the dependencies

```sh
npm install
```

You can find the default config in `config/default.json` file, put your owner API secret there `y8yG0N5OxngGqqAaCPvt`. You may also set a private key for the signer API, it should be base58 encoded. Your config should be something like.

```json
{
  "grin_wallet_host": "127.0.0.1",
  "grin_wallet_port": 3420,
  "grin_wallet_password": "",
  "grin_api_user": "grin",
  "grin_api_secret": "y8yG0N5OxngGqqAaCPvt",
  "signer_sk": "EKFcGigWJjpwGfdUry1wr7abZwrHJw63HFLTyirVcdrewDskjTUL"
}
```

Now you may run the signer server in dev mode

```sh
npm run dev
```

it will listed on the port `6060`. Time to try it!

Here is an example (valid) payment proof for you

```json
{
  "amount": "10000000",
  "excess": "0903284a6e6b90c657fe08277c6cc7062744939192f0a956526cd241a7cc2259b1",
  "recipient_address": "grin1kjxlcgad4m8rde5ktzussu2yn2l36tl7ega9qp475c3q8qjra3ysrn2s8r",
  "recipient_sig": "e8ee267c99b3069573302ea88836a1e4769ff1cdd013e6238f4c685c67a7da2880af36cdec788ce19b01350a30dc9ce36f2aaf54a9be528b0d2e7b83e7a00609",
  "sender_address": "grin1zvhxtzjvu7kdz5r6mxkax3qdf6m4f7x8jcyeufx9ppjfwtnpkcrs494l5f",
  "sender_sig": "9f63f36fb6aeed051a0ee899a1f5e945a06bbfe93c398516ba8f21c6879d938bbbe7af3135df3e3f1849120d42fcf90f3d9326ab85ee47649234497c5958d10c"
}
```

you can make a cURL request from your command line to locally running signer server and get the signature

```sh
curl --location --request POST 'http://localhost:6060/v1/verify' \
--header 'Content-Type: application/json' \
--data-raw '{
  "amount": "10000000",
  "excess": "0903284a6e6b90c657fe08277c6cc7062744939192f0a956526cd241a7cc2259b1",
  "recipient_address": "grin1kjxlcgad4m8rde5ktzussu2yn2l36tl7ega9qp475c3q8qjra3ysrn2s8r",
  "recipient_sig": "e8ee267c99b3069573302ea88836a1e4769ff1cdd013e6238f4c685c67a7da2880af36cdec788ce19b01350a30dc9ce36f2aaf54a9be528b0d2e7b83e7a00609",
  "sender_address": "grin1zvhxtzjvu7kdz5r6mxkax3qdf6m4f7x8jcyeufx9ppjfwtnpkcrs494l5f",
  "sender_sig": "9f63f36fb6aeed051a0ee899a1f5e945a06bbfe93c398516ba8f21c6879d938bbbe7af3135df3e3f1849120d42fcf90f3d9326ab85ee47649234497c5958d10c"
}'
```

your response should be

```json
{
  "valid": true,
  "signature": {
    "r": "19719210114695498533909512135023729416935872761248643747997860533639597824462",
    "s": "10260718653647646978147241575069973752839977883683396473813075905173344380713"
  }
}
```

you can forge the payment proof by changing it a bit, then you will not get the signature but you will still get a response indicating the payment proof is invalid

```json
{
  "valid": false,
  "signature": null
}
```

### Running your signer server in production

#### Setting up the GRIN wallet

#### Setting up the server

## License

[Apache-2.0](LICENSE)
