# EAS - createPrivateAttestation

### Creating Private Attestations

To create an private attestation (`0x20351f973fdec1478924c89dfa533d8f872defa108d9c3c6512267d7e7e5dbc2`), you could use `createPrivateAttestation` function with correct data and its schema. Here's an example:

```ts
import { createPrivateAttestation } from "@icetealabs/eas-private-merkle-tree";

const eas = new EAS(EASContractAddress);
const offchain = await eas.getOffchain();

const data = {
  foo: "FOO",
  bar: "bar",
  qux: true,
};

const output = await createPrivateAttestation(
  offchain,
  signer,
  "string foo, string bar, bool qux",
  data,
  {
    recipient: "0xFD50b031E778fAb33DfD2Fc3Ca66a1EeF0652165",
    expirationTime: 0n, // Unix timestamp of when attestation expires. (0 for no expiration)
    time: BigInt(Math.floor(Date.now() / 1000)), // Unix timestamp of current time
    revocable: true, // Be aware that if your schema is not revocable, this MUST be false
    refUID:
      "0x0000000000000000000000000000000000000000000000000000000000000000",
  }
);

console.log(output.attestation);
console.log(output.tree.dump());
```

This function will return an OZ standard merkle tree, a signed offchain attestation object containing the UID, signature, and attestation data.

It also works with more complex schemas. E.g. array of records and nested objects.

```ts
import { createPrivateAttestation } from "@icetealabs/eas-private-merkle-tree";

const eas = new EAS(EASContractAddress);
const offchain = await eas.getOffchain();

const data = [
  {
    name: "acme",
    stargazers: 17,
    contributedRepositories: [
      {
        name: "acme/1",
        commits: 3,
        stargazers: 31387,
        totalCommits: 37324,
      },
      {
        name: "acme/2",
        commits: 1,
        stargazers: 2890,
        totalCommits: 14831,
      },
      {
        name: "acme/3",
        commits: 2,
        stargazers: 5467,
        totalCommits: 785,
      },
    ],
  },
  {
    name: "qux",
    stargazers: 14,
    contributedRepositories: [
      {
        name: "qux/4",
        commits: 1,
        stargazers: 2440,
        totalCommits: 171,
      },
    ],
  },
];

const output = await createPrivateAttestation(
  offchain,
  signer,
  "string name, uint32 stargazers, (string name, uint32 stargazers, uint32 commits, uint32 totalCommits)[] contributedRepositories",
  data,
  {
    recipient: "0xFD50b031E778fAb33DfD2Fc3Ca66a1EeF0652165",
    expirationTime: 0n, // Unix timestamp of when attestation expires. (0 for no expiration)
    time: BigInt(Math.floor(Date.now() / 1000)), // Unix timestamp of current time
    revocable: true, // Be aware that if your schema is not revocable, this MUST be false
    refUID:
      "0x0000000000000000000000000000000000000000000000000000000000000000",
  }
);

console.log(output.attestation);
console.log(output.tree.dump());
```

### Serialization for EASscan

EASScan uses a different form of merkle proof serialization. If you're looking to make your proof compatible with the EASScan, use `merkleProofStandardToEAS` function.

```ts
import { merkleProofStandardToEAS } from "@icetealabs/eas-private-merkle-tree";

const treeDumped = JSONStringify(output.tree.dump());
const proofs = output.tree.getMultiProof([0, 2]);

const tree = StandardMerkleTree.load(JSON.parse(treeDumped));
expect(tree.verifyMultiProof(proofs)).toBe(true);

// eas-style for https://optimism-sepolia.easscan.org/tools
const proofsEAS = merkleProofStandardToEAS(proofs);
```
