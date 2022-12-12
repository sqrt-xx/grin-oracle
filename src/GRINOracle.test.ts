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
  let grin_amount: Field,
    grin_excess: Field,
    grin_recipient_address: Field,
    grin_recipient_sig: Field,
    grin_sender_address: Field,
    grin_sender_sig: Field;
  let pk: PublicKey;

  beforeAll(async () => {
    await isReady;
    if (proofsEnabled) GRINOracle.compile();

    grin_amount = new Field(100000000);
    grin_excess = new Field(
      '28783455613069620014840473251348557738933380647839115000599866215832096325235'
    );
    grin_recipient_address = new Field(
      '3689974313220076055418846131063705776311096184579946919306434732455896611888'
    );
    grin_recipient_sig = new Field(
      '4570389341152650111395746081201642870012863223030121300802058945710386057856'
    );
    grin_sender_address = new Field(
      '9620937679898968338525645350950688097144501894608865205938790361282342044747'
    );
    grin_sender_sig = new Field(
      '22157734480512192946050221127298174172172193081358271971604604457294184033840'
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
      r: '9942534691202104965893609053142274997847947625488210468303249301192395204530',
      s: '22473842449465986932563778600771717397074160355636519540628490356855887449046',
    });

    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.verify(
        grin_amount,
        grin_excess,
        grin_recipient_address,
        grin_recipient_sig,
        grin_sender_address,
        grin_sender_sig,
        signature
      );
    });
    await txn.prove();
    await txn.send();

    const events = await zkAppInstance.fetchEvents();
    const verifiedEventValue = events[0].event.toFields(null)[0];
    expect(verifiedEventValue).toEqual(grin_excess);
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
        zkAppInstance.verify(
          grin_amount,
          grin_excess,
          grin_recipient_address,
          grin_recipient_sig,
          grin_sender_address,
          grin_sender_sig,
          signature
        );
      });
    }).rejects;
  });
});
