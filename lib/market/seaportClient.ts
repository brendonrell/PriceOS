/*
 * lib/market/seaportClient — the on-chain half of the secondary market.
 *
 * CLIENT-ONLY and HEAVY (ethers + seaport-js). Never import this module
 * statically from anything in the render path — marketClient.ts pulls it in
 * via `await import('./seaportClient')` at action time, so the wallet-signing
 * machinery stays out of the main bundle.
 *
 * Money model (Brendon, locked 2026-07-02): the buyer pays the listed price
 * as-is; the ONLY take is the 5% EIP-2981 royalty (60/40 artist/platform via
 * the Project's PaymentSplitter), deducted from the seller's side. No PD
 * platform fee. Every order this module builds carries the royalty as a
 * consideration item — Seaport doesn't read 2981 on its own, the order is
 * the enforcement.
 *
 * Offers are WETH (escrow-free bids, OpenSea semantics); the offer flow wraps
 * the shortfall automatically before signing. Listings settle in native ETH.
 */

import { BrowserProvider, Contract, JsonRpcSigner, parseEther } from 'ethers';
import type { Eip1193Provider } from 'ethers';
import { Seaport } from '@opensea/seaport-js';
import { ItemType } from '@opensea/seaport-js/lib/constants';
import { MerkleTree } from '@opensea/seaport-js/lib/utils/merkletree';
import type {
  CreateOrderInput,
  OrderWithCounter,
  OrderComponents,
  InputCriteria,
} from '@opensea/seaport-js/lib/types';
import type { WalletClient } from 'viem';
import { CHAIN_ID, ROYALTY_BPS, WETH_ADDRESS } from './chain';
import type { SeaportOrderJson } from './orderTypes';

/** Step reporter — the sheets feed these into their progress readouts so the
 *  UI always reads as moving forward (CLAUDE.md §9). */
export type StepCb = (label: string) => void;

const WETH_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function deposit() payable',
];

interface Rig {
  seaport: Seaport;
  signer: JsonRpcSigner;
  provider: BrowserProvider;
  address: string;
}

/** wagmi WalletClient → ethers signer → Seaport. The wallet transport is an
 *  EIP-1193 provider for every connector in the stack (injected + WC). */
async function rigFor(wallet: WalletClient): Promise<Rig> {
  const account = wallet.account;
  if (!account) throw new Error('Wallet not connected');
  const provider = new BrowserProvider(
    wallet.transport as unknown as Eip1193Provider,
    CHAIN_ID,
  );
  const signer = new JsonRpcSigner(provider, account.address);
  // ethers ships dual ESM/CJS type trees; seaport-js's Signer resolves to the
  // CJS one — same runtime class, so the cast is type-plumbing only.
  const seaport = new Seaport(signer as unknown as ConstructorParameters<typeof Seaport>[0]);
  return { seaport, signer, provider, address: account.address };
}

function ethToWei(priceEth: string): bigint {
  const wei = parseEther(priceEth.trim());
  if (wei <= 0n) throw new Error('Bad price');
  return wei;
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

/** Run a use case's actions with step reporting. Approval/wrap actions are
 *  real transactions (each waits for its receipt); the last action is either
 *  the signature (create) or the exchange transaction. */
async function runCreateActions(
  useCase: {
    actions: readonly unknown[];
    executeAllActions: () => Promise<unknown>;
  },
  onStep?: StepCb,
): Promise<unknown> {
  const approvals = useCase.actions.length - 1;
  if (approvals > 0) onStep?.('APPROVING');
  // executeAllActions transacts each approval (waiting for confirmation)
  // and then requests the order signature — exactly the sequence we want;
  // the step labels above/below bracket it for the progress readout.
  const signPing = setTimeout(() => onStep?.('SIGN IN WALLET'), approvals > 0 ? 400 : 0);
  try {
    return await useCase.executeAllActions();
  } finally {
    clearTimeout(signPing);
  }
}

export interface SignedOrder {
  order: SeaportOrderJson;
  orderHash: string;
}

function toSignedOrder(seaport: Seaport, order: OrderWithCounter): SignedOrder {
  const orderHash = seaport.getOrderHash(order.parameters);
  return { order: order as unknown as SeaportOrderJson, orderHash };
}

/** Listing input — one token at one price. */
export interface ListingInput {
  contract: string;
  tokenId: string;
  priceEth: string;
  royaltyReceiver: string;
  startTime: number;
  endTime: number;
}

function listingOrderInput(address: string, input: ListingInput): CreateOrderInput {
  const wei = ethToWei(input.priceEth);
  return {
    offer: [
      { itemType: ItemType.ERC721, token: input.contract, identifier: input.tokenId },
    ],
    consideration: [
      { amount: wei.toString(), recipient: address },
    ],
    fees: [{ recipient: input.royaltyReceiver, basisPoints: ROYALTY_BPS }],
    startTime: input.startTime,
    endTime: input.endTime,
  };
}

/** Sign one listing. Returns the stored ticket. */
export async function createListing(
  wallet: WalletClient,
  input: ListingInput,
  onStep?: StepCb,
): Promise<SignedOrder> {
  const rig = await rigFor(wallet);
  const useCase = await rig.seaport.createOrder(
    listingOrderInput(rig.address, input),
    rig.address,
  );
  const order = (await runCreateActions(useCase, onStep)) as OrderWithCounter;
  return toSignedOrder(rig.seaport, order);
}

/** Sign N listings with ONE wallet signature (Seaport bulk order tree).
 *  Re-list included — the caller cancels replaced orders separately. */
export async function createBulkListings(
  wallet: WalletClient,
  inputs: ListingInput[],
  onStep?: StepCb,
): Promise<SignedOrder[]> {
  const rig = await rigFor(wallet);
  const useCase = await rig.seaport.createBulkOrders(
    inputs.map((i) => listingOrderInput(rig.address, i)),
    rig.address,
  );
  const orders = (await runCreateActions(useCase, onStep)) as OrderWithCounter[];
  return orders.map((o) => toSignedOrder(rig.seaport, o));
}

/** Make sure the wallet holds `amountWei` WETH — wraps the shortfall. */
async function ensureWeth(rig: Rig, amountWei: bigint, onStep?: StepCb): Promise<void> {
  const weth = new Contract(WETH_ADDRESS, WETH_ABI, rig.signer);
  const bal = (await weth.balanceOf(rig.address)) as bigint;
  if (bal >= amountWei) return;
  const shortfall = amountWei - bal;
  const ethBal = await rig.provider.getBalance(rig.address);
  if (ethBal < shortfall) throw new Error('Insufficient balance');
  onStep?.('WRAPPING ETH');
  const tx = await weth.deposit({ value: shortfall });
  await tx.wait();
}

/** Offer input — WETH bid on one token / a collection / a trait set. */
export interface OfferInput {
  contract: string;
  priceEth: string;
  royaltyReceiver: string;
  startTime: number;
  endTime: number;
  /** exactly one of the three: */
  tokenId?: string;
  collection?: boolean;
  identifiers?: string[];
}

export async function createOffer(
  wallet: WalletClient,
  input: OfferInput,
  onStep?: StepCb,
): Promise<SignedOrder> {
  const rig = await rigFor(wallet);
  const wei = ethToWei(input.priceEth);
  await ensureWeth(rig, wei, onStep);

  let considerationItem: CreateOrderInput['consideration'][number];
  if (input.tokenId != null) {
    considerationItem = {
      itemType: ItemType.ERC721,
      token: input.contract,
      identifier: input.tokenId,
      recipient: rig.address,
    };
  } else if (input.identifiers && input.identifiers.length > 0) {
    considerationItem = {
      itemType: ItemType.ERC721,
      token: input.contract,
      identifiers: input.identifiers,
      recipient: rig.address,
    } as CreateOrderInput['consideration'][number];
  } else {
    // Collection-wide: criteria root 0 = any token in the contract.
    considerationItem = {
      itemType: ItemType.ERC721,
      token: input.contract,
      criteria: '0',
      recipient: rig.address,
    } as CreateOrderInput['consideration'][number];
  }

  const useCase = await rig.seaport.createOrder(
    {
      offer: [{ token: WETH_ADDRESS, amount: wei.toString() }],
      consideration: [considerationItem],
      fees: [{ recipient: input.royaltyReceiver, basisPoints: ROYALTY_BPS }],
      startTime: input.startTime,
      endTime: input.endTime,
    },
    rig.address,
  );
  const order = (await runCreateActions(useCase, onStep)) as OrderWithCounter;
  return toSignedOrder(rig.seaport, order);
}

/** Sign N item offers with ONE wallet signature. Wraps the combined WETH
 *  shortfall once up front. */
export async function createBulkOffers(
  wallet: WalletClient,
  inputs: (OfferInput & { tokenId: string })[],
  onStep?: StepCb,
): Promise<SignedOrder[]> {
  const rig = await rigFor(wallet);
  const total = inputs.reduce((s, i) => s + ethToWei(i.priceEth), 0n);
  await ensureWeth(rig, total, onStep);
  const useCase = await rig.seaport.createBulkOrders(
    inputs.map((i) => ({
      offer: [{ token: WETH_ADDRESS, amount: ethToWei(i.priceEth).toString() }],
      consideration: [
        {
          itemType: ItemType.ERC721,
          token: i.contract,
          identifier: i.tokenId,
          recipient: rig.address,
        },
      ],
      fees: [{ recipient: i.royaltyReceiver, basisPoints: ROYALTY_BPS }],
      startTime: i.startTime,
      endTime: i.endTime,
    })),
    rig.address,
  );
  const orders = (await runCreateActions(useCase, onStep)) as OrderWithCounter[];
  return orders.map((o) => toSignedOrder(rig.seaport, o));
}

/** THE EXCHANGE ⇌ — sign one bilateral trade order:
 *  offer = your pieces (+ WETH kicker), consideration = the pieces you want
 *  delivered to you (+ native ETH from the counterparty). No royalty legs —
 *  trades are barter (no sale price). The counterparty fills it like any
 *  listing; owning the requested pieces is what makes them the only filler. */
export interface TradeOrderInput {
  give: { contract: string; tokenId: string }[];
  get: { contract: string; tokenId: string }[];
  /** ETH added by the proposer (rides as WETH — offer items can't be native). */
  giveEth?: string;
  /** ETH requested from the counterparty (settles native at fill). */
  getEth?: string;
  startTime: number;
  endTime: number;
}

export async function createTradeOrder(
  wallet: WalletClient,
  input: TradeOrderInput,
  onStep?: StepCb,
): Promise<SignedOrder> {
  const rig = await rigFor(wallet);
  const giveWei = input.giveEth && Number(input.giveEth) > 0 ? ethToWei(input.giveEth) : 0n;
  const getWei = input.getEth && Number(input.getEth) > 0 ? ethToWei(input.getEth) : 0n;
  if (giveWei > 0n) await ensureWeth(rig, giveWei, onStep);

  const offer: CreateOrderInput['offer'][number][] = input.give.map((g) => ({
    itemType: ItemType.ERC721,
    token: g.contract,
    identifier: g.tokenId,
  }));
  if (giveWei > 0n) offer.push({ token: WETH_ADDRESS, amount: giveWei.toString() });

  const consideration: CreateOrderInput['consideration'][number][] = input.get.map((g) => ({
    itemType: ItemType.ERC721,
    token: g.contract,
    identifier: g.tokenId,
    recipient: rig.address,
  }));
  if (getWei > 0n) consideration.push({ amount: getWei.toString(), recipient: rig.address });

  const useCase = await rig.seaport.createOrder(
    { offer, consideration, startTime: input.startTime, endTime: input.endTime },
    rig.address,
  );
  const order = (await runCreateActions(useCase, onStep)) as OrderWithCounter;
  return toSignedOrder(rig.seaport, order);
}

/** Fill a trade order you're the counterparty of (approvals + one tx). */
export async function fulfillTrade(
  wallet: WalletClient,
  order: SeaportOrderJson,
  onStep?: StepCb,
): Promise<string> {
  const rig = await rigFor(wallet);
  const useCase = await rig.seaport.fulfillOrder({
    order: order as unknown as OrderWithCounter,
    accountAddress: rig.address,
  });
  return runExchange(useCase as never, onStep);
}

/** Run a fulfillment use case: approvals then the exchange tx. Returns the
 *  exchange tx hash once mined. */
async function runExchange(
  useCase: { actions: readonly { type: string; transactionMethods?: { transact: () => Promise<{ hash: string; wait: () => Promise<unknown> }> } }[] },
  onStep?: StepCb,
): Promise<string> {
  let txHash = '';
  for (const action of useCase.actions) {
    if (!action.transactionMethods) continue;
    onStep?.(action.type === 'approval' ? 'APPROVING' : 'CONFIRM IN WALLET');
    const tx = await action.transactionMethods.transact();
    if (action.type !== 'approval') {
      txHash = tx.hash;
      onStep?.('CONFIRMING');
    }
    await tx.wait();
  }
  return txHash;
}

/** Buy one listed piece (fill the seller's order at face price). */
export async function fulfillListing(
  wallet: WalletClient,
  order: SeaportOrderJson,
  onStep?: StepCb,
): Promise<string> {
  const rig = await rigFor(wallet);
  const useCase = await rig.seaport.fulfillOrder({
    order: order as unknown as OrderWithCounter,
    accountAddress: rig.address,
  });
  return runExchange(useCase as never, onStep);
}

/** The sweep — fill many listings in ONE transaction. Unfillable orders
 *  (sold/cancelled meanwhile) are skipped by Seaport's availability logic. */
export async function fulfillListings(
  wallet: WalletClient,
  orders: SeaportOrderJson[],
  onStep?: StepCb,
): Promise<string> {
  const rig = await rigFor(wallet);
  const useCase = await rig.seaport.fulfillOrders({
    fulfillOrderDetails: orders.map((o) => ({ order: o as unknown as OrderWithCounter })),
    accountAddress: rig.address,
  });
  return runExchange(useCase as never, onStep);
}

/** Accept a WETH offer on a piece you own. For criteria offers pass the token
 *  being sold + (trait offers) the identifier set the order committed to. */
export async function acceptOffer(
  wallet: WalletClient,
  order: SeaportOrderJson,
  opts?: { tokenId?: string; identifiers?: string[] },
  onStep?: StepCb,
): Promise<string> {
  const rig = await rigFor(wallet);
  let considerationCriteria: InputCriteria[] | undefined;
  if (opts?.tokenId != null) {
    const proof =
      opts.identifiers && opts.identifiers.length > 0
        ? new MerkleTree(opts.identifiers).getProof(opts.tokenId)
        : [];
    considerationCriteria = [{ identifier: opts.tokenId, proof }];
  }
  const useCase = await rig.seaport.fulfillOrder({
    order: order as unknown as OrderWithCounter,
    accountAddress: rig.address,
    ...(considerationCriteria ? { considerationCriteria } : {}),
  });
  return runExchange(useCase as never, onStep);
}

/** Cancel signed orders on-chain (listings and/or offers). One tx. */
export async function cancelOrders(
  wallet: WalletClient,
  orders: SeaportOrderJson[],
  onStep?: StepCb,
): Promise<string> {
  const rig = await rigFor(wallet);
  onStep?.('CONFIRM IN WALLET');
  const tx = await rig.seaport
    .cancelOrders(orders.map((o) => o.parameters as unknown as OrderComponents), rig.address)
    .transact();
  onStep?.('CONFIRMING');
  await tx.wait();
  return tx.hash;
}

export { nowSec };
