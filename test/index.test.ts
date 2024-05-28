import { beforeAll, describe, expect, test, vi } from "vitest";
import { createPrivateAttestation, merkleProofStandardToEAS } from "../";
import {
  JsonRpcProvider,
  type Signer,
  Wallet,
  ZeroHash,
  randomBytes,
} from "ethers";
import {
  type AttestationShareablePackageObject,
  EAS,
  compactOffchainAttestationPackage,
  type Offchain,
} from "@ethereum-attestation-service/eas-sdk";
import { Base64 } from "js-base64";
import pako from "pako";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { hexlify } from "ethers";

describe("issue", () => {
  let signer: Signer;
  let eas: EAS;
  let offchain: Offchain;
  let opts: Parameters<typeof createPrivateAttestation>["4"];
  beforeAll(async () => {
    vi.mock("ethers", async (importOriginal) => {
      const mod = (await importOriginal()) as object;
      return {
        ...mod,
        randomBytes() {
          return Buffer.from([
            0xa9, 0x6c, 0x9a, 0x56, 0xdc, 0x36, 0xc7, 0x70, 0xd8, 0xc7, 0xb3,
            0x71, 0x3c, 0x7c, 0xe8, 0xcd, 0x06, 0x89, 0x80, 0x85, 0x48, 0x48,
            0x7f, 0xbe, 0x35, 0x12, 0xa6, 0x48, 0x09, 0xe6, 0x8c, 0xdc,
          ]);
        },
      };
    });

    const provider = new JsonRpcProvider(
      "https://optimism-sepolia-rpc.publicnode.com",
    );
    signer = new Wallet(
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // throwable private key
      provider,
    );
    eas = new EAS("0x4200000000000000000000000000000000000021", {
      signer,
    });
    offchain = await eas.getOffchain();

    const now = new Date("2024-05-28T08:40:54.242Z").getTime();
    const nowInt = BigInt(now);
    const expirationInt = BigInt(now + 24 * 60 * 60 * 1000);

    opts = {
      recipient: "0x706D282CF94c4f60651391b3AC213888677CEBd0",
      expirationTime: expirationInt,
      time: nowInt,
      refUID: ZeroHash,
      revocable: true,
      salt: hexlify(randomBytes(32)), // this is for the test only
    };
  });

  test("it works in simple cases", async () => {
    const data = {
      foo: "FOO",
      bar: "bar",
      qux: true,
    };

    const schema = "string foo, string bar, bool qux";

    const output = await createPrivateAttestation(
      offchain,
      signer,
      schema,
      data,
      opts,
    );
    expect(output.attestation).toBeDefined();
    expect(output.tree).toBeDefined();

    const signerAddress = await signer.getAddress();
    expect(
      offchain.verifyOffchainAttestationSignature(
        signerAddress,
        output.attestation.sig,
      ),
    ).toBe(true);

    const treeDumped = JSONStringify(output.tree.dump());
    const proofs = output.tree.getMultiProof([0, 2]);

    const tree = StandardMerkleTree.load(JSON.parse(treeDumped));
    expect(tree.verifyMultiProof(proofs)).toBe(true);

    // eas-style for https://optimism-sepolia.easscan.org/tools
    const proofsEAS = merkleProofStandardToEAS(proofs);

    const url = createOffchainURL(output.attestation);
    console.log("E2E test with EAS tools at:", url);
    console.log(JSONStringify(proofsEAS));
  });

  test("it works with records", async () => {
    const data = {
      ranking:
        "0x2800000000000000000000000000000000000000000000000000000000000000",
      isPrivate: [true, false],
      stats: [
        {
          walletAddress: "0x2Ca97ce4182617f300a5C2b927AFbd557b0783fD",
          reputation: 8,
          nested: [
            { score: 1, ok: true },
            { score: 3, ok: false },
          ],
        },
        {
          walletAddress: "0x669387271AA2589673BE62956083792034bc6bE4",
          reputation: 12,
          nested: [
            { score: 2, ok: false },
            { score: 4, ok: true },
          ],
        },
      ],
    };

    const schema =
      "(address walletAddress, uint8 reputation, (uint8 score, bool ok)[] nested)[] stats, bytes32 ranking, bool[] isPrivate";

    const output = await createPrivateAttestation(
     offchain,
      signer,
      schema,
      data,
      opts,
    );

    const signerAddress = await signer.getAddress();
    expect(
      offchain.verifyOffchainAttestationSignature(
        signerAddress,
        output.attestation.sig,
      ),
    ).toBe(true);

    const treeDumped = JSONStringify(output.tree.dump());
    expect(treeDumped).toMatchSnapshot();
  });

  test("it works with arrays", async () => {
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

    const schema =
      "string name, uint32 stargazers, (string name, uint32 stargazers, uint32 commits, uint32 totalCommits)[] contributedRepositories";

    const output = await createPrivateAttestation(
      offchain,
      signer,
      schema,
      data,
      opts,
    );

    const signerAddress = await signer.getAddress();
    expect(
      offchain.verifyOffchainAttestationSignature(
        signerAddress,
        output.attestation.sig,
      ),
    ).toBe(true);

    const treeDumped = JSONStringify(output.tree.dump());
    expect(treeDumped).toMatchSnapshot();
  });
});

function JSONStringify(v: unknown) {
  return JSON.stringify(v, (_, v) => {
    if (typeof v === "bigint") {
      return v.toString();
    }
    return v;
  });
}

const EAS_EXPLORERS: { [key: string]: string } = {
  "10": "https://optimism.easscan.org",
  "11155420": "https://optimism-sepolia.easscan.org",
};

function createOffchainURL(pkg: AttestationShareablePackageObject) {
  const chainId = pkg.sig.domain.chainId.toString();
  const baseURL = EAS_EXPLORERS[chainId];
  const base64 = zipAndEncodeToBase64(pkg);
  return `${baseURL}/offchain/url/#attestation=${encodeURIComponent(base64)}`;
}

function zipAndEncodeToBase64(pkg: AttestationShareablePackageObject) {
  const compacted = compactOffchainAttestationPackage(pkg);

  const jsoned = JSON.stringify(compacted, (_, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );

  const gzipped = pako.deflate(jsoned, { level: 9 });

  return Base64.fromUint8Array(gzipped);
}
