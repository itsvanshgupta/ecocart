const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function fetchProducts(filters?: {
  category?: string
  min_grade?: string
  max_price?: number
}) {
  const params = new URLSearchParams()
  if (filters?.category) params.append('category', filters.category)
  if (filters?.min_grade) params.append('min_grade', filters.min_grade)
  if (filters?.max_price) params.append('max_price', String(filters.max_price))

  const res = await fetch(`${API_URL}/products?${params}`)
  if (!res.ok) throw new Error('Failed to fetch products')
  return res.json()
}

export async function fetchProduct(id: string) {
  const res = await fetch(`${API_URL}/products/${id}`)
  if (!res.ok) throw new Error('Failed to fetch product')
  return res.json()
}

export async function fetchGrade(productId: string) {
  const res = await fetch(`${API_URL}/grade/${productId}`)
  if (!res.ok) return null
  return res.json()
}