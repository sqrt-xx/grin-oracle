import { GRINOracle } from './GRINOracle';
import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  Signature,
} from 'snarkyjs';

let proofsEnabled = false;
function createLocalBlockchain() {
  const Local = Mina.LocalBlockchain({ proofsEnabled });
  Mina.setActiveInstance(Local);
  return Local.testAccounts[0].privateKey;
}

async function localDeploy(
  zkAppInstance: GRINOracle,
  zkAppPrivatekey: PrivateKey,
  deployerAccount: PrivateKey,
  signerPublicKey: PublicKey
) {
  const txn = await Mina.transaction(deployerAccount, () => {
    AccountUpdate.fundNewAccount(deployerAccount);
    zkAppInstance.deploy({ zkappKey: zkAppPrivatekey });
    zkAppInstance.initializeOrRevoke(signerPublicKey);
  });
  await txn.prove();
  txn.sign([zkAppPrivatekey]);
  await txn.send();
}

describe('GRINOracle', () => {
  let deployerAccount: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey;
  let grin_payment_proof_commitment: Field;
  let pk: PublicKey;

  beforeAll(async () => {
    await isReady;
    if (proofsEnabled) GRINOracle.compile();

    grin_payment_proof_commitment = new Field(
      '16798322553783080360949380696706946417861502541300893652149661423092642133041'
    );
    pk = PublicKey.fromBase58(
      'B62qmPgPfdtJR1p622QVgK4ZyJyWRXmDcZeC8BoAKtTVbRZPHwpiF6Z'
    );
  });

  beforeEach(async () => {
    deployerAccount = createLocalBlockchain();
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
  });

  afterAll(async () => {
    setTimeout(shutdown, 0);
  });

  it('generates and deploys the `GRINOracle` smart contract', async () => {
    const zkAppInstance = new GRINOracle(zkAppAddress);
    await localDeploy(zkAppInstance, zkAppPrivateKey, deployerAccount, pk);
    const oraclePublicKey = zkAppInstance.oraclePublicKey.get();
    expect(oraclePublicKey).toEqual(pk);
  });

  it('allows to revoke the previous private key', async () => {
    const zkAppInstance = new GRINOracle(zkAppAddress);
    await localDeploy(zkAppInstance, zkAppPrivateKey, deployerAccount, pk);
    const oraclePublicKey = zkAppInstance.oraclePublicKey.get();
    expect(oraclePublicKey).toEqual(pk);

    // revoke the previous key
    const new_sk: PrivateKey = PrivateKey.random();
    const new_pk: PublicKey = new_sk.toPublicKey();

    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.initializeOrRevoke(new_pk);
    });
    await txn.prove();
    txn.sign([zkAppPrivateKey]);
    await txn.send();

    // check if correctly updated
    const newOraclePublicKey = zkAppInstance.oraclePublicKey.get();
    expect(newOraclePublicKey).toEqual(new_pk);
  });

  it('emits an event containing a verified commitment such that its GRIN payment proof is valid', async () => {
    const zkAppInstance = new GRINOracle(zkAppAddress);
    await localDeploy(zkAppInstance, zkAppPrivateKey, deployerAccount, pk);

    const signature = Signature.fromJSON({
      r: '5547642720567330615899727612212559813520476864559112681613197169414763846211',
      s: '23860512247161351780731386873840202294152592802961048695255776109680887398579',
    });

    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.verify(grin_payment_proof_commitment, signature);
    });
    await txn.prove();
    await txn.send();

    const events = await zkAppInstance.fetchEvents();
    const verifiedEventValue = events[0].event.toFields(null)[0];
    expect(verifiedEventValue).toEqual(grin_payment_proof_commitment);
  });

  it('throws an error if the provided signature is invalid', async () => {
    const zkAppInstance = new GRINOracle(zkAppAddress);
    await localDeploy(zkAppInstance, zkAppPrivateKey, deployerAccount, pk);

    const signature = Signature.fromJSON({
      r: '26545513748775911233424851469484096799413741017006352456100547880447752952428',
      s: '7381406986124079327199694038222605261248869991738054485116460354242251864564',
    });

    expect(async () => {
      await Mina.transaction(deployerAccount, () => {
        zkAppInstance.verify(grin_payment_proof_commitment, signature);
      });
    }).rejects;
  });
});
