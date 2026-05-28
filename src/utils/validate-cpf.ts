export function validateCpf(raw: string | null | undefined): boolean {
  if (!raw) return false
  const d = raw.replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const calc = (slice: number[], mod: number) =>
    slice.reduce((acc, v, i) => acc + v * (mod - i), 0) % 11
  const digits = d.split('').map(Number)
  const r1 = calc(digits.slice(0, 9), 10)
  const r2 = calc(digits.slice(0, 10), 11)
  return digits[9] === (r1 < 2 ? 0 : 11 - r1) && digits[10] === (r2 < 2 ? 0 : 11 - r2)
}

export function formatCpf(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}
