import type { Product, ProductCategory } from '~/types/catalog'

export type MenuSection = {
  key: string
  title: string | null
  products: Product[]
}

const menuSectionTitles: { category: ProductCategory; title: string }[] = [
  { category: 'drinks', title: 'Bebidas' },
  { category: 'food', title: 'Comida' },
]

export function groupProductsByCategory(products: Product[]): MenuSection[] {
  const knownCategories = new Set<string>(menuSectionTitles.map(({ category }) => category))
  const sections: MenuSection[] = menuSectionTitles
    .map(({ category, title }) => ({
      key: category,
      title,
      products: products.filter((product) => product.category === category),
    }))
    .filter((section) => section.products.length > 0)

  const uncategorizedProducts = products.filter((product) => !knownCategories.has(product.category))

  if (uncategorizedProducts.length > 0) {
    sections.push({
      key: 'uncategorized',
      title: sections.length > 0 ? 'Más productos' : null,
      products: uncategorizedProducts,
    })
  }

  return sections
}
