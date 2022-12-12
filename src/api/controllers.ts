import config from 'config';

import { Request, Response } from 'express';

import { respondValid, respondInvalid } from '../helpers';
import { JSONRequestEncrypted, initSecure } from './grin_wallet';

const endpointVerify = async (req: Request, res: Response) => {
  // load the config
  const grin_host: string = config.get('grin_wallet_host');
  const grin_port: number = config.get('grin_wallet_port');
  const grin_wallet_password: string = config.get('grin_wallet_password');
  const grin_api_user: string = config.get('grin_api_user');
  const grin_api_secret: string = config.get('grin_api_secret');
  const signer_sk: string = config.get('signer_sk');

  // get the data from req.body
  const amount: string = req.body.amount;
  const excess: string = req.body.excess;
  const recipient_address: string = req.body.recipient_address;
  const recipient_sig: string = req.body.recipient_sig;
  const sender_address: string = req.body.sender_address;
  const sender_sig: string = req.body.sender_sig;

  // verify the payment proof
  let shared_key = await initSecure(
    grin_host,
    grin_port,
    grin_api_user,
    grin_api_secret
  );

  let response = await new JSONRequestEncrypted(
    1,
    'open_wallet',
    {
      name: '',
      password: grin_wallet_password,
    },
    grin_host,
    grin_port,
    grin_api_user,
    grin_api_secret
  ).send(shared_key);
  const token = response.result.Ok;

  response = await new JSONRequestEncrypted(
    1,
    'verify_payment_proof',
    {
      token: token,
      proof: {
        amount: amount,
        excess: excess,
        recipient_address: recipient_address,
        recipient_sig: recipient_sig,
        sender_address: sender_address,
        sender_sig: sender_sig,
      },
    },
    grin_host,
    grin_port,
    grin_api_user,
    grin_api_secret
  ).send(shared_key);
  if (response.error) {
    return res.status(200).json(respondInvalid());
  }

  // respond
  return res.status(200).json(
    respondValid(signer_sk, {
      amount: amount,
      excess: excess,
      recipient_address: recipient_address,
      recipient_sig: recipient_sig,
      sender_address: sender_address,
      sender_sig: sender_sig,
    })
  );
};

export { endpointVerify };
