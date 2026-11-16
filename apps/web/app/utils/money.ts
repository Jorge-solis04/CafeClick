const currencyFormatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

export function priceToCents(price: string) {
  const [whole = '0', fraction = ''] = price.split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2))
}

export function formatCents(cents: number) {
  return currencyFormatter.format(cents / 100)
}

export function formatPrice(price: string) {
  return formatCents(priceToCents(price))
}

export function formatItemCount(count: number) {
  return count === 1 ? '1 producto' : `${count} productos`
}
