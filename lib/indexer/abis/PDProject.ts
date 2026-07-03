// Minimal ERC-721 ABI — Transfer is all the indexer needs.
// `as const` preserves the literal types viem needs to decode the log.
export const PDProjectAbi = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: true, name: "tokenId", type: "uint256" },
    ],
  },
] as const;
