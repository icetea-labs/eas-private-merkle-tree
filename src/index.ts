import type {
  Offchain,
  OffchainAttestationParams,
} from "@ethereum-attestation-service/eas-sdk";
import { prepareCredentialTree, prepareCredentialTreeArr } from "./utils";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import type { TypeDataSigner } from "@ethereum-attestation-service/eas-sdk/dist/offchain/typed-data-handler";
export type EASPrivateData = Record<string, unknown>;

async function createPrivateAttestation(
  offchain: Offchain,
  signer: TypeDataSigner,
  schema: string,
  data: EASPrivateData | Array<EASPrivateData & { name: string }>,
  params: Omit<OffchainAttestationParams, "schema" | "data"> &
    Partial<Pick<OffchainAttestationParams, "schema" | "data">>,
) {
  const dataPrepared = Array.isArray(data)
    ? prepareCredentialTreeArr(schema, data)
    : prepareCredentialTree(schema, data);
  const tree = StandardMerkleTree.of(dataPrepared, [
    "string",
    "string",
    "bytes",
    "bytes32",
  ]);

  params.data = tree.root;
  params.schema =
    "0x20351f973fdec1478924c89dfa533d8f872defa108d9c3c6512267d7e7e5dbc2";

  const attestation = await offchain.signOffchainAttestation(
    params as OffchainAttestationParams,
    signer,
  );

  return {
    attestation: {
      sig: attestation,
      signer: await signer.getAddress(),
    },
    tree,
  };
}

export { createPrivateAttestation };
export * from "./utils";
