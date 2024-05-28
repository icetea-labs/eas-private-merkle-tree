import type { Offchain, OffchainAttestationParams } from "@ethereum-attestation-service/eas-sdk";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import type { TypeDataSigner } from "@ethereum-attestation-service/eas-sdk/dist/offchain/typed-data-handler";
export type EASPrivateData = Record<string, unknown>;
declare function createPrivateAttestation(offchain: Offchain, signer: TypeDataSigner, schema: string, data: EASPrivateData | Array<EASPrivateData & {
    name: string;
}>, params: Omit<OffchainAttestationParams, "schema" | "data"> & Partial<Pick<OffchainAttestationParams, "schema" | "data">>): Promise<{
    attestation: {
        sig: import("@ethereum-attestation-service/eas-sdk").SignedOffchainAttestation;
        signer: string;
    };
    tree: StandardMerkleTree<[string, string, string, string]>;
}>;
export { createPrivateAttestation };
export * from "./utils";
