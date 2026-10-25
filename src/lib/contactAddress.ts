// Sinaida's address, XOR-sealed and base64-encoded, so no part of it (name,
// provider, '@') is readable or greppable in the shipped bundle. Opened only
// on click. Seal a new address with the same key: btoa(xor(address, KEY)).
const SEALED = 'ABkLAh0WBF0DERYQGwozFwgCHR5LEB8I';
const KEY = 'spectre';

function unseal(sealed: string): string {
  return [...atob(sealed)]
    .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ KEY.charCodeAt(i % KEY.length)))
    .join('');
}

/** Sinaida's address, opened in memory only when someone asks for it. */
export function contactAddress(): string {
  return unseal(SEALED);
}
