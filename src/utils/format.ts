export const BRL = (n: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

export interface MoneyParts {
  symbol: string
  whole: string
  cents: string
}

export const BRL_PARTS = (n: number): MoneyParts => {
  const s = BRL(n)
  const m = s.match(/^(R\$\s)(.+),(\d{2})$/)
  if (!m) return { symbol: 'R$', whole: String(Math.floor(n)), cents: '00' }
  return { symbol: m[1].trim(), whole: m[2], cents: m[3] }
}

export const nowISO = (): string => new Date().toISOString()

export const timeBR = (iso: string): string =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export const dateBR = (iso: string): string =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
