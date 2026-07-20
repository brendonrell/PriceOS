// THE EXCHANGE ⇌ — checkTradeOrder is the server gate for chain-rail trades:
// the signed Seaport order must match the declared sides EXACTLY (pieces,
// kickers, recipients) or the book refuses it. These are the cases that guard
// real assets at cutover.

import { describe, it, expect } from 'vitest';
import { checkTradeOrder } from '../lib/market/orderCheck';
import { ITEM_ERC20, ITEM_ERC721, ITEM_NATIVE, type SeaportOrderJson } from '../lib/market/orderTypes';
import { WETH_ADDRESS } from '../lib/market/chain';

const PROPOSER = '0x1111111111111111111111111111111111111111';
const CONTRACT_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const CONTRACT_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const ZERO = '0x0000000000000000000000000000000000000000';
const ZERO32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

function nft(token: string, id: string, recipient?: string) {
  const base = {
    itemType: ITEM_ERC721,
    token,
    identifierOrCriteria: id,
    startAmount: '1',
    endAmount: '1',
  };
  return recipient ? { ...base, recipient } : base;
}

function order(
  offer: SeaportOrderJson['parameters']['offer'],
  consideration: SeaportOrderJson['parameters']['consideration'],
): SeaportOrderJson {
  const now = Math.floor(Date.now() / 1000);
  return {
    parameters: {
      offerer: PROPOSER,
      zone: ZERO,
      orderType: 0,
      startTime: now - 60,
      endTime: now + 86_400,
      zoneHash: ZERO32,
      salt: '1',
      offer,
      consideration,
      totalOriginalConsiderationItems: consideration.length,
      conduitKey: ZERO32,
      counter: 0,
    },
    // Bulk-length signature → the structural path (Seaport enforces at fill).
    signature: `0x${'ab'.repeat(100)}`,
  };
}

const GIVE = [{ contract: CONTRACT_A, tokenId: '7' }];
const GET = [{ contract: CONTRACT_B, tokenId: '9' }];

describe('checkTradeOrder — the chain-rail trade gate', () => {
  it('accepts a clean piece-for-piece trade', async () => {
    const o = order([nft(CONTRACT_A, '7')], [nft(CONTRACT_B, '9', PROPOSER)]);
    const w = await checkTradeOrder(o, {
      address: PROPOSER, give: GIVE, get: GET, giveEthWei: 0n, getEthWei: 0n,
    });
    expect(w.endTime).toBeGreaterThan(w.startTime);
  });

  it('accepts a trade with a WETH kicker on the give side', async () => {
    const o = order(
      [nft(CONTRACT_A, '7'), { itemType: ITEM_ERC20, token: WETH_ADDRESS, identifierOrCriteria: '0', startAmount: '500', endAmount: '500' }],
      [nft(CONTRACT_B, '9', PROPOSER)],
    );
    await expect(checkTradeOrder(o, {
      address: PROPOSER, give: GIVE, get: GET, giveEthWei: 500n, getEthWei: 0n,
    })).resolves.toBeTruthy();
  });

  it('accepts a trade asking native ETH from the counterparty', async () => {
    const o = order(
      [nft(CONTRACT_A, '7')],
      [nft(CONTRACT_B, '9', PROPOSER), { itemType: ITEM_NATIVE, token: ZERO, identifierOrCriteria: '0', startAmount: '500', endAmount: '500', recipient: PROPOSER }],
    );
    await expect(checkTradeOrder(o, {
      address: PROPOSER, give: GIVE, get: GET, giveEthWei: 0n, getEthWei: 500n,
    })).resolves.toBeTruthy();
  });

  it('rejects when the order offers a DIFFERENT piece than declared', async () => {
    const o = order([nft(CONTRACT_A, '8')], [nft(CONTRACT_B, '9', PROPOSER)]);
    await expect(checkTradeOrder(o, {
      address: PROPOSER, give: GIVE, get: GET, giveEthWei: 0n, getEthWei: 0n,
    })).rejects.toThrow(/mismatch/i);
  });

  it('rejects when a requested piece would deliver to someone else', async () => {
    const o = order([nft(CONTRACT_A, '7')], [nft(CONTRACT_B, '9', '0x2222222222222222222222222222222222222222')]);
    await expect(checkTradeOrder(o, {
      address: PROPOSER, give: GIVE, get: GET, giveEthWei: 0n, getEthWei: 0n,
    })).rejects.toThrow(/proposer/i);
  });

  it('rejects a smuggled ETH leg the declared sides never named', async () => {
    const o = order(
      [nft(CONTRACT_A, '7'), { itemType: ITEM_ERC20, token: WETH_ADDRESS, identifierOrCriteria: '0', startAmount: '500', endAmount: '500' }],
      [nft(CONTRACT_B, '9', PROPOSER)],
    );
    await expect(checkTradeOrder(o, {
      address: PROPOSER, give: GIVE, get: GET, giveEthWei: 0n, getEthWei: 0n,
    })).rejects.toThrow(/ETH/i);
  });

  it('rejects a kicker amount that differs from the declared amount', async () => {
    const o = order(
      [nft(CONTRACT_A, '7'), { itemType: ITEM_ERC20, token: WETH_ADDRESS, identifierOrCriteria: '0', startAmount: '499', endAmount: '499' }],
      [nft(CONTRACT_B, '9', PROPOSER)],
    );
    await expect(checkTradeOrder(o, {
      address: PROPOSER, give: GIVE, get: GET, giveEthWei: 500n, getEthWei: 0n,
    })).rejects.toThrow(/amount/i);
  });

  it('rejects an order signed by someone other than the proposer', async () => {
    const o = order([nft(CONTRACT_A, '7')], [nft(CONTRACT_B, '9', PROPOSER)]);
    o.parameters.offerer = '0x3333333333333333333333333333333333333333';
    await expect(checkTradeOrder(o, {
      address: PROPOSER, give: GIVE, get: GET, giveEthWei: 0n, getEthWei: 0n,
    })).rejects.toThrow(/offerer/i);
  });

  it('rejects an already-expired order window', async () => {
    const o = order([nft(CONTRACT_A, '7')], [nft(CONTRACT_B, '9', PROPOSER)]);
    o.parameters.endTime = Math.floor(Date.now() / 1000) - 10;
    await expect(checkTradeOrder(o, {
      address: PROPOSER, give: GIVE, get: GET, giveEthWei: 0n, getEthWei: 0n,
    })).rejects.toThrow(/expired/i);
  });
});
