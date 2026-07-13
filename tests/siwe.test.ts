// SIWE message verification — real wallet, real signature, real library path.
import { describe, it, expect } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { SiweMessage } from 'siwe';
import { verifySiweMessage } from '@/lib/auth/siwe';

async function makeSigned(nonce: string, domain: string) {
  const account = privateKeyToAccount(generatePrivateKey());
  const msg = new SiweMessage({
    domain,
    address: account.address,
    statement: 'Sign in to Price Discussion',
    uri: `https://${domain}`,
    version: '1',
    chainId: 1,
    nonce,
  });
  const prepared = msg.prepareMessage();
  const signature = await account.signMessage({ message: prepared });
  return { prepared, signature, address: account.address.toLowerCase() };
}

describe('verifySiweMessage', () => {
  it('accepts a valid signature with matching nonce + domain', async () => {
    const { prepared, signature, address } = await makeSigned('abcdefgh', 'pd.test');
    const out = await verifySiweMessage(prepared, signature, 'abcdefgh', 'pd.test');
    expect(out?.address).toBe(address);
  });

  it('rejects a nonce mismatch (replay protection)', async () => {
    const { prepared, signature } = await makeSigned('abcdefgh', 'pd.test');
    expect(await verifySiweMessage(prepared, signature, 'DIFFERENT', 'pd.test')).toBeNull();
  });

  it('rejects a domain mismatch (cross-site replay protection)', async () => {
    const { prepared, signature } = await makeSigned('abcdefgh', 'pd.test');
    expect(await verifySiweMessage(prepared, signature, 'abcdefgh', 'evil.test')).toBeNull();
  });

  it('rejects a signature from a different wallet', async () => {
    const { prepared } = await makeSigned('abcdefgh', 'pd.test');
    const other = await makeSigned('abcdefgh', 'pd.test');
    expect(await verifySiweMessage(prepared, other.signature, 'abcdefgh', 'pd.test')).toBeNull();
  });
});
