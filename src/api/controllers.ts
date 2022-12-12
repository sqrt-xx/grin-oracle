import { Request, Response } from 'express';

import { respondValid } from '../helpers';
import { JSONRequestEncrypted, initSecure } from './grin_wallet';

const endpointVerify = async (req: Request, res: Response) => {
  const grin_host: string = '127.0.0.1';
  const grin_port: number = 3420;
  const grin_wallet_password: string = '';
  const grin_api_user: string = 'grin';
  const grin_api_secret: string = '5oXxcBmgPTusKkcmNcbJ';
  const signer_pk: string =
    'EKFcGigWJjpwGfdUry1wr7abZwrHJw63HFLTyirVcdrewDskjTUL';

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
  console.log(shared_key);

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
  console.log(response);
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
  console.log(response);

  // respond
  return res.status(200).json(
    respondValid(signer_pk, {
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
