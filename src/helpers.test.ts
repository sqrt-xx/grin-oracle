import {
  GRINPaymentProof,
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
  let grin_payment_proof_commitment: Field[];
  let grin_payment_proof: GRINPaymentProof;
  let sk: PrivateKey;
  let pk: PublicKey;

  beforeAll(async () => {
    await isReady;
    grin_address =
      'grin1y3fxgseja6a4agchfl93wf9jhzpx5cqdg32mvh36jdsf6k9wsrrq96grxx';
    grin_address_hex =
      '2452644332eebb5ea3174fcb1724b2b8826a600d4455b65e3a93609d58ae80c6';
    grin_payment_proof_commitment = [
      new Field(100000000),
      new Field(
        '28783455613069620014840473251348557738933380647839115000599866215832096325235'
      ),
      new Field(
        '3689974313220076055418846131063705776311096184579946919306434732455896611888'
      ),
      new Field(
        '4570389341152650111395746081201642870012863223030121300802058945710386057856'
      ),
      new Field(
        '9620937679898968338525645350950688097144501894608865205938790361282342044747'
      ),
      new Field(
        '22157734480512192946050221127298174172172193081358271971604604457294184033840'
      ),
    ];
    sk = PrivateKey.fromBase58(
      'EKFcGigWJjpwGfdUry1wr7abZwrHJw63HFLTyirVcdrewDskjTUL'
    );
    pk = PublicKey.fromBase58(
      'B62qmPgPfdtJR1p622QVgK4ZyJyWRXmDcZeC8BoAKtTVbRZPHwpiF6Z'
    );
    grin_payment_proof = {
      amount: '100000000',
      excess:
        '08325ba59b0580abdfc66e18cc948240e7da7ced77799110887d3335626b84bc15',
      recipient_address:
        'grin1gy3qxc4rvvqzc5slzh6nvdae6ns2qldws3z7vwhesyfp9vnkv3hsc53yhy',
      recipient_sig:
        '742a5aa51ef6b26ec75e0cc3b68fe3daa5f78d74f773d06b3e89b64e459d5375c29442c53f228dcba72b158ad6bba80102d5d3f87efba42cbbb17049aee96f0a',
      sender_address:
        'grin1y3fxgseja6a4agchfl93wf9jhzpx5cqdg32mvh36jdsf6k9wsrrq96grxx',
      sender_sig:
        'a6b5d8c156bbf43cdb78494efb92c2af431ab1822692e504296b8758c663d5f9b03a62f63c7b1af824ada1e3ef017ba6f100b7b7b1d1665f6a05aa35ab89e007',
    };
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
    const commitment: Field[] =
      grinPaymentProofToCommitment(grin_payment_proof);
    expect(commitment).toEqual(grin_payment_proof_commitment);
  });

  it('should sign and verify the commitment', async () => {
    const signature: Signature = signCommitment(
      sk,
      grin_payment_proof_commitment
    );
    const valid: Bool = signature.verify(pk, grin_payment_proof_commitment);
    expect(valid.toBoolean()).toBeTruthy();
  });
});
