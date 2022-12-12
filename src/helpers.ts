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

export function getGRINKernelCommitment(kernel_hex: string): Field {
  const decoded: Uint8Array = new Uint8Array(
    Buffer.from(kernel_hex.padStart(2 * 33, '00'), 'hex')
  );
  const numbers: number[] = Uint8ArrayConcatNumber([decoded]);

  // split it into two fields, first takes first 16 bytes, second takes next 17
  const member_1: Field = Field.fromBytes(numbers.slice(0, 16));
  const member_2: Field = Field.fromBytes(numbers.slice(16, 33));

  // compute the commitment field using the Poseidon hash
  return Poseidon.hash([member_1, member_2]);
}

export function getGRINSignatureCommitment(signature_hex: string): Field {
  const decoded: Uint8Array = new Uint8Array(
    Buffer.from(signature_hex.padStart(2 * 64, '00'), 'hex')
  );
  const numbers: number[] = Uint8ArrayConcatNumber([decoded]);

  // split it into three fields,
  const member_1: Field = Field.fromBytes(numbers.slice(0, 21));
  const member_2: Field = Field.fromBytes(numbers.slice(21, 42));
  const member_3: Field = Field.fromBytes(numbers.slice(42, 64));

  // compute the commitment field using the Poseidon hash
  return Poseidon.hash([member_1, member_2, member_3]);
}

export function getGRINAddressCommitment(grin_address: string): Field {
  const decoded: Uint8Array = grinAddressToUint8Array(grin_address);
  const numbers: number[] = Uint8ArrayConcatNumber([decoded]);

  // split it into two fields
  const member_1: Field = Field.fromBytes(numbers.slice(0, 16));
  const member_2: Field = Field.fromBytes(numbers.slice(16, 32));

  // compute the commitment field using the Poseidon hash
  return Poseidon.hash([member_1, member_2]);
}

export function grinPaymentProofToCommitment(
  payment_proof: GRINPaymentProof
): Field[] {
  const amount: Field = new Field(parseInt(payment_proof['amount']));
  const excess: Field = getGRINKernelCommitment(payment_proof['excess']);
  const recipient_address: Field = getGRINAddressCommitment(
    payment_proof['recipient_address']
  );
  const recipient_sig: Field = getGRINSignatureCommitment(
    payment_proof['recipient_sig']
  );
  const sender_address: Field = getGRINAddressCommitment(
    payment_proof['sender_address']
  );
  const sender_sig: Field = getGRINSignatureCommitment(
    payment_proof['sender_sig']
  );
  return [
    amount,
    excess,
    recipient_address,
    recipient_sig,
    sender_address,
    sender_sig,
  ];
}

export function signCommitment(sk: PrivateKey, commitment: Field[]): Signature {
  return Signature.create(sk, commitment);
}

export function respondValid(
  sk: string,
  payment_proof: GRINPaymentProof
): Response {
  const commitment: Field[] = grinPaymentProofToCommitment(payment_proof);
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
