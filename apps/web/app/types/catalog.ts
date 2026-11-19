export type ProductCategory = 'drinks' | 'food'

export type Product = {
  id: number
  name: string
  price: string
  category: ProductCategory
}
