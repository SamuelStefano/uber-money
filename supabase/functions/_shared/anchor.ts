export async function anchorDiscriminator(name: string): Promise<Uint8Array> {
  const buf = new TextEncoder().encode('global:' + name)
  return new Uint8Array(await crypto.subtle.digest('SHA-256', buf)).slice(0, 8)
}
