import bech32 from 'bech32-buffer';

import { Field, Signature, PrivateKey, Poseidon } from 'snarkyjs';

export interface GRINPaymentProof {
  amount: string;
  excess: string;
  recipient_address: string;
  recipient_sig: string;
  sender_address: string;
  sender_sig: string;
}

export interface ResponseSignature {
  r: string;
  s: string;
}

export interface Response {
  valid: boolean;
  signature: ResponseSignature | null;
}

function Uint8ArrayConcatNumber(arrays: Uint8Array[]): number[] {
  let t: number[] = [];
  for (let j = 0; j < arrays.length; ++j) {
    for (let i = 0; i < arrays[j].length; ++i) {
      t.push(arrays[j][i]);
    }
  }
  return t;
}

export function grinAddressToUint8Array(grin_address: string): Uint8Array {
  const res = bech32.decode(grin_address);
  if (res.prefix != 'grin' && res.prefix != 'tgrin') {
    throw new Error('Only GRIN Bech32 encoded addresses are supported.');
  }
  const decoded_hex: string = Buffer.from(res.data).toString('hex');
  return new Uint8Array(Buffer.from(decoded_hex.padStart(2 * 32, '00'), 'hex'));
}

export function grinPaymentProofToCommitment(
  payment_proof: GRINPaymentProof
): Field {
  const _amount: Uint8Array = new Uint8Array(
    Buffer.from(
      parseInt(payment_proof['amount'])
        .toString(16)
        .padStart(2 * 8, '00'),
      'hex'
    )
  );
  const _excess: Uint8Array = new Uint8Array(
    Buffer.from(payment_proof['excess'].padStart(2 * 33, '00'), 'hex')
  );
  const _recipient_address: Uint8Array = grinAddressToUint8Array(
    payment_proof['recipient_address']
  );
  const _recipient_sig: Uint8Array = new Uint8Array(
    Buffer.from(payment_proof['recipient_sig'].padStart(2 * 64, '00'), 'hex')
  );
  const _sender_address: Uint8Array = grinAddressToUint8Array(
    payment_proof['sender_address']
  );
  const _sender_sig: Uint8Array = new Uint8Array(
    Buffer.from(payment_proof['sender_sig'].padStart(2 * 64, '00'), 'hex')
  );

  const proof_payload: number[] = Uint8ArrayConcatNumber([
    _amount,
    _excess,
    _recipient_address,
    _recipient_sig,
    _sender_address,
    _sender_sig,
  ]);

  const payload_fields: Field[] = [
    Field.fromBytes(proof_payload.slice(0, 31)),
    Field.fromBytes(proof_payload.slice(31, 62)),
    Field.fromBytes(proof_payload.slice(62, 93)),
    Field.fromBytes(proof_payload.slice(93, 124)),
    Field.fromBytes(proof_payload.slice(124, 155)),
    Field.fromBytes(proof_payload.slice(155, 186)),
    Field.fromBytes(proof_payload.slice(186, 217)),
    Field.fromBytes(proof_payload.slice(217, 233)),
  ];

  return Poseidon.hash(payload_fields);
}

export function signCommitment(sk: PrivateKey, commitment: Field): Signature {
  return Signature.create(sk, [commitment]);
}

export function respondValid(
  sk: string,
  payment_proof: GRINPaymentProof
): Response {
  const commitment: Field = grinPaymentProofToCommitment(payment_proof);
  const _sk: PrivateKey = PrivateKey.fromBase58(sk);
  const signature: Signature = signCommitment(_sk, commitment);
  return {
    valid: true,
    signature: signature.toJSON(),
  };
}

export function respondInvalid(): Response {
  return {
    valid: false,
    signature: null,
  };
}
