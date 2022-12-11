import {
  grinAddressToUint8Array,
  grinPaymentProofToCommitment,
  signCommitment,
} from './helpers';

import {
  isReady,
  shutdown,
  Field,
  PublicKey,
  PrivateKey,
  Signature,
  Bool,
} from 'snarkyjs';

describe('handling GRIN address', () => {
  let grin_address: string;
  let grin_address_hex: string;
  let grin_payment_proof_commitment: Field;
  let sk: PrivateKey;
  let pk: PublicKey;

  beforeAll(async () => {
    await isReady;
    grin_address =
      'grin1y3fxgseja6a4agchfl93wf9jhzpx5cqdg32mvh36jdsf6k9wsrrq96grxx';
    grin_address_hex =
      '2452644332eebb5ea3174fcb1724b2b8826a600d4455b65e3a93609d58ae80c6';
    grin_payment_proof_commitment = new Field(
      '16798322553783080360949380696706946417861502541300893652149661423092642133041'
    );
    sk = PrivateKey.fromBase58(
      'EKFcGigWJjpwGfdUry1wr7abZwrHJw63HFLTyirVcdrewDskjTUL'
    );
    pk = PublicKey.fromBase58(
      'B62qmPgPfdtJR1p622QVgK4ZyJyWRXmDcZeC8BoAKtTVbRZPHwpiF6Z'
    );
  });

  afterAll(async () => {
    setTimeout(shutdown, 0);
  });

  it('should correctly decode a GRIN address', async () => {
    const decoded_hex: string = Buffer.from(
      grinAddressToUint8Array(grin_address)
    ).toString('hex');
    expect(decoded_hex).toEqual(grin_address_hex);
  });

  it('should correctly compute a Field commitment of GRIN payment proof', async () => {
    const commitment: Field = grinPaymentProofToCommitment(
      '100000000',
      '08325ba59b0580abdfc66e18cc948240e7da7ced77799110887d3335626b84bc15',
      'grin1gy3qxc4rvvqzc5slzh6nvdae6ns2qldws3z7vwhesyfp9vnkv3hsc53yhy',
      '742a5aa51ef6b26ec75e0cc3b68fe3daa5f78d74f773d06b3e89b64e459d5375c29442c53f228dcba72b158ad6bba80102d5d3f87efba42cbbb17049aee96f0a',
      'grin1y3fxgseja6a4agchfl93wf9jhzpx5cqdg32mvh36jdsf6k9wsrrq96grxx',
      'a6b5d8c156bbf43cdb78494efb92c2af431ab1822692e504296b8758c663d5f9b03a62f63c7b1af824ada1e3ef017ba6f100b7b7b1d1665f6a05aa35ab89e007'
    );
    console.log(commitment.toString());
    expect(commitment).toEqual(grin_payment_proof_commitment);
  });

  it('should sign and verify the commitment', async () => {
    const signature: Signature = signCommitment(
      sk,
      grin_payment_proof_commitment
    );
    const valid: Bool = signature.verify(pk, [grin_payment_proof_commitment]);
    console.log(valid.toBoolean());
    expect(valid.toBoolean()).toBeTruthy();
  });
});
