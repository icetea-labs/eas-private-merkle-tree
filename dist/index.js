// src/utils.ts
import { AbiCoder, ParamType, hexlify, randomBytes } from "ethers";
var prepareCredentialTree = (schema, data) => {
  const paramType = parseSchema(schema);
  return paramType.components.map((component) => {
    const value = data[component.name];
    let encoded = "";
    try {
      encoded = AbiCoder.defaultAbiCoder().encode(
        [component.format("full")],
        [value]
      );
    } catch (err) {
      throw new Error("SchemaEncodingError: invalid data", { cause: err });
    }
    return [
      component.format("full"),
      component.name,
      encoded,
      hexlify(randomBytes(32))
    ];
  });
};
var prepareCredentialTreeArr = (schema, data) => {
  try {
    return data.map((item) => {
      const encodedData = AbiCoder.defaultAbiCoder().encode(
        [`(${schema})`],
        [item]
      );
      return [`(${schema})`, item.name, encodedData, hexlify(randomBytes(32))];
    });
  } catch (error) {
    throw new Error("SchemaEncodingError: invalid data", { cause: error });
  }
};
var parseSchema = (schema) => {
  let paramType;
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
        "SchemaParsingError: first-class properties must have a name"
      );
    }
  }
  return paramType;
};
function merkleProofStandardToEAS(proofs) {
  if (!proofs.proof || !proofs.leaves || !proofs.proofFlags) {
    return;
  }
  return {
    ...proofs,
    leaves: proofs.leaves.map((v) => ({
      type: v[0],
      name: v[1],
      value: AbiCoder.defaultAbiCoder().decode([v[0]], v[2])[0],
      salt: v[3]
    }))
  };
}

// src/index.ts
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
async function createPrivateAttestation(offchain, signer, schema, data, params) {
  const dataPrepared = Array.isArray(data) ? prepareCredentialTreeArr(schema, data) : prepareCredentialTree(schema, data);
  const tree = StandardMerkleTree.of(dataPrepared, [
    "string",
    "string",
    "bytes",
    "bytes32"
  ]);
  params.data = tree.root;
  params.schema = "0x20351f973fdec1478924c89dfa533d8f872defa108d9c3c6512267d7e7e5dbc2";
  const attestation = await offchain.signOffchainAttestation(
    params,
    signer
  );
  return {
    attestation: {
      sig: attestation,
      signer: await signer.getAddress()
    },
    tree
  };
}
export {
  createPrivateAttestation,
  merkleProofStandardToEAS,
  parseSchema,
  prepareCredentialTree,
  prepareCredentialTreeArr
};
