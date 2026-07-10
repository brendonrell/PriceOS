---
title: "$PRICE Contract"
description: "The deployed $PRICE ERC-20 on Ethereum mainnet: address, functions, deliberate absences, compiler settings, and verification against the published source."
category: "price-token"
keywords: ["PRICE contract", "ERC-20", "address", "etherscan", "verification"]
last_updated: "2026-07-10"
---

# $PRICE Contract

The technical reference for the deployed $PRICE ERC-20. For policy and design framing, see [Overview](/docs/price-token/overview), [Tokenomics](/docs/price-token/tokenomics), and [No Platform Utility](/docs/price-token/no-platform-utility).

## Deployed address

| Network | Address |
| --- | --- |
| Ethereum mainnet | [`0x173a012c7c8ca3cfb531dcad84a40c53dbe74638`](https://etherscan.io/token/0x173a012c7c8ca3cfb531dcad84a40c53dbe74638) |

Deployed 2026-07-03, with the full 100,000,000 supply minted to the deployer wallet (`pricediscussion.eth`) for distribution per [Tokenomics](/docs/price-token/tokenomics).

## Contract details

- **Standard:** ERC-20 (OpenZeppelin v5.0.2)
- **Name:** Price Discussion · **Symbol:** PRICE · **Decimals:** 18
- **Total supply:** 100,000,000 × 10^18 base units, fixed forever
- **Shape:** a constructor and an import — fourteen lines. The simplicity is the security model. The contract contains no distribution logic; distribution happens off-contract via direct transfers.

## Public functions

The full standard ERC-20 specification and nothing else: `name`, `symbol`, `decimals`, `totalSupply`, `balanceOf`, `transfer`, `approve`, `allowance`, `transferFrom`.

## What the contract does not have

- **No public `mint`.** The single deployment-time mint is the only one possible.
- **No `burn`.** Plain OZ ERC-20, not ERC20Burnable — supply cannot decrease.
- **No claim or distribution functions.** No Merkle root, no claim flow, no allowlist.
- **No admin role.** No owner, no pauser, no blacklister — no role of any kind.
- **No pause, no blacklist, no freeze.** Transfers cannot be halted or filtered.
- **No upgradeability.** Not a proxy; the deployed bytecode is the permanent implementation.
- **No fee-on-transfer, no rebasing.** Balances change only by explicit transfer.

## Verification

Source is published at [github.com/brendonrell/pd-price-token](https://github.com/brendonrell/pd-price-token) under MIT. Reproducible-build settings from the repository's deploy notes:

- Solidity `0.8.20` (`v0.8.20+commit.a1b79de6`), optimizer 200 runs, EVM `paris`
- OpenZeppelin Contracts `v5.0.2`, constructor arguments: none
- The repo's solc Standard-JSON-Input reproduces the deployed bytecode exactly; Etherscan verification uses the same file.

## Reading it

```ts
import { createPublicClient, http, erc20Abi } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({ chain: mainnet, transport: http() })

const balance = await client.readContract({
  address: '0x173a012c7c8ca3cfb531dcad84a40c53dbe74638',
  abi: erc20Abi,
  functionName: 'balanceOf',
  args: [walletAddress],
})
```

## Events

Standard ERC-20 only: `Transfer` (including the single deployment mint, from the zero address) and `Approval`.

## Further reading

- [Overview](/docs/price-token/overview) · [Tokenomics](/docs/price-token/tokenomics) · [No Platform Utility](/docs/price-token/no-platform-utility)
