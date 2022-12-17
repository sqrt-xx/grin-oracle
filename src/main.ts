import { GRINOracle } from './GRINOracle.js';
import { isReady, shutdown, Mina, PrivateKey, PublicKey } from 'snarkyjs';

import { deploy } from './deploy.js';
import fs from 'fs';
import {
  loopUntilAccountExists,
  makeAndSendTransaction,
  zkAppNeedsInitialization,
  accountExists,
} from './utils.js';

(async function main() {
  await isReady;

  console.log('SnarkyJS loaded');

  // ----------------------------------------------------

  const Berkeley = Mina.BerkeleyQANet(
    'https://proxy.berkeley.minaexplorer.com/graphql'
  );
  Mina.setActiveInstance(Berkeley);

  let transactionFee = 100_000_000;

  const deployAlias = process.argv[2];

  const deployerKeysFileContents = fs.readFileSync(
    'keys/' + deployAlias + '.json',
    'utf8'
  );

  const deployerPrivateKeyBase58 = JSON.parse(
    deployerKeysFileContents
  ).privateKey;

  const deployerPrivateKey = PrivateKey.fromBase58(deployerPrivateKeyBase58);

  const zkAppPrivateKey = PrivateKey.random();
  console.log('zkApp private key');
  console.log(zkAppPrivateKey.toBase58());
  console.log('zkApp public key');
  console.log(zkAppPrivateKey.toPublicKey().toBase58());

  const sk: PrivateKey = PrivateKey.random();
  const pk: PublicKey = sk.toPublicKey();

  console.log('Your oracle private key is');
  console.log(sk.toBase58());
  console.log('Your oracle public key is');
  console.log(pk.toBase58());

  // ----------------------------------------------------

  let account = await loopUntilAccountExists({
    account: deployerPrivateKey.toPublicKey(),
    eachTimeNotExist: () => {
      console.log(
        'Deployer account does not exist. ' +
          'Request funds at faucet ' +
          'https://faucet.minaprotocol.com/?address=' +
          deployerPrivateKey.toPublicKey().toBase58()
      );
    },
    isZkAppAccount: false,
  });

  console.log(
    `Using fee payer account with nonce ${account.nonce}, balance ${account.balance}`
  );

  // ----------------------------------------------------

  console.log('Compiling smart contract...');
  let { verificationKey } = await GRINOracle.compile();

  const zkAppPublicKey = zkAppPrivateKey.toPublicKey();
  let zkapp = new GRINOracle(zkAppPublicKey);

  const accountExistsAlready = await accountExists(zkAppPublicKey);

  if (!accountExistsAlready) {
    // Programmatic deploy:
    //   Besides the CLI, you can also create accounts programmatically. This is useful if you need
    //   more custom account creation - say deploying a zkApp to a different key than the fee payer
    //   key, programmatically parameterizing a zkApp before initializing it, or creating Smart
    //   Contracts programmatically for users as part of an application.
    await deploy(
      deployerPrivateKey,
      zkAppPrivateKey,
      zkAppPublicKey,
      zkapp,
      verificationKey
    );
  }

  // ----------------------------------------------------

  let zkAppAccount = await loopUntilAccountExists({
    account: zkAppPrivateKey.toPublicKey(),
    eachTimeNotExist: () =>
      console.log('waiting for zkApp account to be deployed...'),
    isZkAppAccount: true,
  });

  let transaction = await Mina.transaction(
    { feePayerKey: deployerPrivateKey, fee: transactionFee },
    () => {
      zkapp.initializeOrRevoke(pk);
    }
  );
  console.log('Creating an execution proof...');
  const time0 = Date.now();
  await transaction.prove();
  const time1 = Date.now();
  console.log('creating proof took', (time1 - time0) / 1e3, 'seconds');

  console.log('Sending the transaction...');
  transaction.sign([zkAppPrivateKey]);
  const res = await transaction.send();
  const hash = await res.hash(); // This will change in a future version of SnarkyJS
  if (hash == null) {
    console.log('error sending transaction (see above)');
  } else {
    console.log(
      'See transaction at',
      'https://berkeley.minaexplorer.com/transaction/' + hash
    );
  }

  let oraclePublicKey = (await zkapp.oraclePublicKey.get())!;
  console.log('current value of num is', oraclePublicKey.toString());

  // ----------------------------------------------------

  console.log('Shutting down');

  await shutdown();
})().catch((e) => console.log(e));
