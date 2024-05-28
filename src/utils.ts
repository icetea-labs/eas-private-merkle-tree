import type { MultiProof } from "@openzeppelin/merkle-tree/dist/core";
import { AbiCoder, ParamType, hexlify, randomBytes } from "ethers";

type ParamTypeWithComponents = ParamType & {
  components: readonly ParamType[];
};

export const prepareCredentialTree = (
  schema: string,
  data: Record<string, unknown>,
): [string, string, string, string][] => {
  const paramType = parseSchema(schema);

  return paramType.components.map((component) => {
    const value = data[component.name];
    let encoded = "";
    try {
      encoded = AbiCoder.defaultAbiCoder().encode(
        [component.format("full")],
        [value],
      );
    } catch (err) {
      throw new Error("SchemaEncodingError: invalid data", { cause: err });
    }

    return [
      component.format("full"),
      component.name,
      encoded,
      hexlify(randomBytes(32)),
    ];
  });
};

export const prepareCredentialTreeArr = (
  schema: string,
  data: (Record<string, unknown> & { name: string })[],
): [string, string, string, string][] => {
  try {
    return data.map((item) => {
      const encodedData = AbiCoder.defaultAbiCoder().encode(
        [`(${schema})`],
        [item],
      );
      return [`(${schema})`, item.name, encodedData, hexlify(randomBytes(32))];
    });
  } catch (error) {
    // Catch error when data does not match with schema
    throw new Error("SchemaEncodingError: invalid data", { cause: error });
  }
};

export const parseSchema = (schema: string): ParamTypeWithComponents => {
  let paramType: ParamType;
  try {
    paramType = ParamType.from(`(${schema})`);
  } catch (err) {
    throw new Error("SchemaParsingError: invalid schema", { cause: err });
  }

  if (!paramType.components?.length) {
    throw new Error("SchemaParsingError: at least one params required");
  }

  for (const v of paramType.components) {
    if (v.name === "") {
      throw new Error(
        "SchemaParsingError: first-class properties must have a name",
      );
    }
  }

  return paramType as ParamTypeWithComponents;
};

export function merkleProofStandardToEAS(
  proofs: MultiProof<string, [string, string, string, string]>,
) {
  if (!proofs.proof || !proofs.leaves || !proofs.proofFlags) {
    return;
  }

  return {
    ...proofs,
    leaves: proofs.leaves.map((v) => ({
      type: v[0],
      name: v[1],
      value: AbiCoder.defaultAbiCoder().decode([v[0]], v[2])[0],
      salt: v[3],
    })),
  };
}
