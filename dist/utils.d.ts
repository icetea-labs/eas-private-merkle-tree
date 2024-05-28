import type { MultiProof } from "@openzeppelin/merkle-tree/dist/core";
import { ParamType } from "ethers";
type ParamTypeWithComponents = ParamType & {
    components: readonly ParamType[];
};
export declare const prepareCredentialTree: (schema: string, data: Record<string, unknown>) => [string, string, string, string][];
export declare const prepareCredentialTreeArr: (schema: string, data: (Record<string, unknown> & {
    name: string;
})[]) => [string, string, string, string][];
export declare const parseSchema: (schema: string) => ParamTypeWithComponents;
export declare function merkleProofStandardToEAS(proofs: MultiProof<string, [string, string, string, string]>): {
    leaves: {
        type: string;
        name: string;
        value: any;
        salt: string;
    }[];
    proof: string[];
    proofFlags: boolean[];
} | undefined;
export {};
