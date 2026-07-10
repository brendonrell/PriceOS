---
title: "Contracts — PaymentSplitter"
description: "The per-Project secondary royalty splitter: receives the 5% EIP-2981 royalty, splits it 60/40 (3% artist / 2% platform), with permissionless ETH and ERC-20 withdrawals."
category: "contracts"
keywords: ["PaymentSplitter", "royalties", "EIP-2981", "60/40", "withdrawals"]
last_updated: "2026-07-10"
---

# Contracts — PaymentSplitter

One PaymentSplitter exists per Project, deployed by the factory beside the Project's ERC-721. It has one job: receive the Project's 5% EIP-2981 secondary royalty and divide it **60/40 between artist and platform** — 3% of each sale to the artist, 2% to the platform. No admin, no upgrade, permanent.

## Design

- **`receive()` is deliberately empty.** Marketplaces forward royalties however they like — including with the 2,300-gas stipend of a plain `transfer`. Any storage write in `receive()` would make those payments (and potentially the sales carrying them) revert, so shares are computed at withdrawal time from cumulative accounting instead of banked per receipt.
- **Cumulative accounting.** Lifetime received = current balance + everything withdrawn. The artist's lifetime entitlement is 60% of that; the platform's is the exact complement, so no wei is ever stranded by rounding. Pending = entitlement − already withdrawn; both entitlements are monotonic, so pending can never underflow.
- **Withdrawals are permissionless.** Funds can only flow to the immutable artist address or the factory's live platform wallet — there is nothing for a third-party caller to gain, so anyone may trigger a payout.
- **The platform side reads the factory live.** A platform-wallet rotation on the factory applies identically to accumulated and future royalties, mirroring the primary path's symmetry.

## Interface

```solidity
// ETH
function totalReceived() external view returns (uint256);
function pendingArtist() external view returns (uint256);
function pendingPlatform() external view returns (uint256);
function withdrawArtist() external;
function withdrawPlatform() external;

// ERC-20 (canonically WETH from accepted offers) — same accounting, per token
function totalReceivedERC20(address token) external view returns (uint256);
function pendingArtistERC20(address token) external view returns (uint256);
function pendingPlatformERC20(address token) external view returns (uint256);
function withdrawERC20Artist(address token) external;
function withdrawERC20Platform(address token) external;
```

ERC-20 accounting is kept independently per token with independent artist and platform paths, so one recipient being unable to receive a given token (a transfer blocklist, for example) never strands the other's share.

## Further reading

- [Royalties, artist's-eye view](/docs/for-artists/royalties)
- [PDProject](/docs/contracts/pd-project) — the `royaltyInfo` that points here
