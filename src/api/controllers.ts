import { Request, Response } from 'express';

import { respondValid } from '../helpers';

const endpointVerify = async (req: Request, res: Response) => {
  // get the data from req.body
  const amount: string = req.body.amount;
  const excess: string = req.body.excess;
  const recipient_address: string = req.body.recipient_address;
  const recipient_sig: string = req.body.recipient_sig;
  const sender_address: string = req.body.sender_address;
  const sender_sig: string = req.body.sender_sig;

  return res.status(200).json(
    respondValid('EKFcGigWJjpwGfdUry1wr7abZwrHJw63HFLTyirVcdrewDskjTUL', {
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
