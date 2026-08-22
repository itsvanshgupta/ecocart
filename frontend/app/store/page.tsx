'use client'

import { useEffect, useState } from 'react'
import ProductCard from '@/components/ProductCard'
import { fetchProducts } from '@/lib/api'
import { Product } from '@/types'

const CATEGORIES = ['all', 'clothing', 'kitchen', 'personal-care', 'accessories', 'electronics']
const GRADES = ['all', 'A', 'B', 'C', 'D']

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [maxPrice, setMaxPrice] = useState(200)

  useEffect(() => {
    setLoading(true)
    fetchProducts({
      category: category === 'all' ? undefined : category,
      max_price: maxPrice
    })
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [category, maxPrice])

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
          🌿 Green Store
        </h1>
        <p style={{ color: '#666', fontSize: '16px' }}>
          Every product AI-graded for sustainability
        </p>
      </div>

      <div style={{ display: 'flex', gap: '32px' }}>
        {/* Sidebar filters */}
        <div style={{
          width: '220px',
          flexShrink: 0,
          background: '#F5F5F0',
          borderRadius: '12px',
          padding: '20px',
          height: 'fit-content'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#444' }}>
            FILTERS
          </h3>

          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>Category</p>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: category === cat ? '#1D9E75' : 'transparent',
                  color: category === cat ? 'white' : '#444',
                  fontSize: '13px',
                  cursor: 'pointer',
                  marginBottom: '2px',
                  textTransform: 'capitalize'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div>
            <p style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
              Max Price: ${maxPrice}
            </p>
            <input
              type="range"
              min={5}
              max={200}
              value={maxPrice}
              onChange={e => setMaxPrice(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Product grid */}
        <div style={{ flex: 1 }}>
          {loading ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '20px'
            }}>
              {[1,2,3,4,5,6].map(i => (
                <div key={i} style={{
                  height: '300px',
                  background: '#F5F5F0',
                  borderRadius: '12px',
                  animation: 'pulse 1.5s infinite'
                }} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>🌱</div>
              <p>No products found. Try adjusting your filters.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '20px'
            }}>
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}