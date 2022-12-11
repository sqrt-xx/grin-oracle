import {
  Field,
  SmartContract,
  state,
  State,
  method,
  DeployArgs,
  Permissions,
  PublicKey,
  Signature,
} from 'snarkyjs';

export class GRINOracle extends SmartContract {
  // Define contract state
  @state(PublicKey) oraclePublicKey = State<PublicKey>();

  // Define contract events
  events = {
    verified: Field,
  };

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
  }

  @method initializeOrRevoke(oraclePublicKey: PublicKey) {
    // Initialize contract state
    this.oraclePublicKey.set(oraclePublicKey);
    // Specify that caller should include signature with tx instead of proof
    this.requireSignature();
  }

  @method verify(commitment: Field, signature: Signature) {
    // Get the oracle public key from the contract state
    const oraclePublicKey = this.oraclePublicKey.get();
    this.oraclePublicKey.assertEquals(oraclePublicKey);

    // Evaluate whether the signature is valid for the provided data
    const validSignature = signature.verify(oraclePublicKey, [commitment]);

    // Check that the signature is valid
    validSignature.assertTrue();

    // Emit an event containing the verified commitment
    this.emitEvent('verified', commitment);
  }
}
