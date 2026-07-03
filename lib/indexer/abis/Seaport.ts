// Minimal Seaport 1.6 ABI — OrderFulfilled is the only event we need
// on-chain. Listings/offers are off-chain on OpenSea and require a
// separate API poller.
export const SeaportAbi = [
  {
    type: "event",
    name: "OrderFulfilled",
    inputs: [
      { indexed: false, name: "orderHash", type: "bytes32" },
      { indexed: true, name: "offerer", type: "address" },
      { indexed: true, name: "zone", type: "address" },
      { indexed: false, name: "recipient", type: "address" },
      {
        indexed: false,
        name: "offer",
        type: "tuple[]",
        components: [
          { name: "itemType", type: "uint8" },
          { name: "token", type: "address" },
          { name: "identifier", type: "uint256" },
          { name: "amount", type: "uint256" },
        ],
      },
      {
        indexed: false,
        name: "consideration",
        type: "tuple[]",
        components: [
          { name: "itemType", type: "uint8" },
          { name: "token", type: "address" },
          { name: "identifier", type: "uint256" },
          { name: "amount", type: "uint256" },
          { name: "recipient", type: "address" },
        ],
      },
    ],
  },
] as const;
