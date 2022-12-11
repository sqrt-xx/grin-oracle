import bech32 from 'bech32-buffer';

import { Field, Signature, PrivateKey, Poseidon } from 'snarkyjs';

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
  amount: string,
  excess: string,
  recipient_address: string,
  recipient_sig: string,
  sender_address: string,
  sender_sig: string
): Field {
  const _amount: Uint8Array = new Uint8Array(
    Buffer.from(
      parseInt(amount)
        .toString(16)
        .padStart(2 * 8, '00'),
      'hex'
    )
  );
  const _excess: Uint8Array = new Uint8Array(
    Buffer.from(excess.padStart(2 * 33, '00'), 'hex')
  );
  const _recipient_address: Uint8Array =
    grinAddressToUint8Array(recipient_address);
  const _recipient_sig: Uint8Array = new Uint8Array(
    Buffer.from(recipient_sig.padStart(2 * 64, '00'), 'hex')
  );
  const _sender_address: Uint8Array = grinAddressToUint8Array(sender_address);
  const _sender_sig: Uint8Array = new Uint8Array(
    Buffer.from(sender_sig.padStart(2 * 64, '00'), 'hex')
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
