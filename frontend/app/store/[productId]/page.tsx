'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import EcoGradeBadge from '@/components/EcoGradeBadge'
import { fetchProduct } from '@/lib/api'
import { Product } from '@/types'

export default function ProductDetailPage() {
  const { productId } = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (productId) {
      fetchProduct(productId as string)
        .then(setProduct)
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [productId])

  if (loading) return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 24px' }}>
      <div style={{ height: '400px', background: '#F5F5F0', borderRadius: '16px' }} />
    </div>
  )

  if (!product) return (
    <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>
      Product not found
    </div>
  )

  const grade = (product as any).eco_scores?.composite_grade

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
        {/* Image */}
        <div style={{
          background: '#F5F5F0',
          borderRadius: '16px',
          overflow: 'hidden',
          height: '400px'
        }}>
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '80px'
            }}>🌿</div>
          )}
        </div>

        {/* Info */}
        <div>
          <p style={{ fontSize: '13px', color: '#1D9E75', fontWeight: '500', textTransform: 'uppercase', marginBottom: '8px' }}>
            {product.category}
          </p>
          <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '16px' }}>
            {product.name}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <span style={{ fontSize: '32px', fontWeight: '700' }}>${product.price}</span>
            {grade && <EcoGradeBadge grade={grade} size="lg" showLabel />}
          </div>

          <p style={{ color: '#666', lineHeight: 1.7, marginBottom: '24px' }}>
            {product.description}
          </p>

          {/* Metadata */}
          <div style={{
            background: '#F5F5F0',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Product details</h3>
            {[
              ['Materials', product.metadata?.materials],
              ['Origin', product.metadata?.origin_country],
              ['Packaging', product.metadata?.packaging_type],
              ['Lifespan', `${product.metadata?.lifespan_years} years`],
              ['Certifications', product.metadata?.certifications?.join(', ') || 'None'],
            ].map(([label, value]) => (
              <div key={label} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: '1px solid #E5E5E5',
                fontSize: '13px'
              }}>
                <span style={{ color: '#888' }}>{label}</span>
                <span style={{ fontWeight: '500' }}>{value}</span>
              </div>
            ))}
          </div>

          <button style={{
            width: '100%',
            padding: '14px',
            borderRadius: '8px',
            backgroundColor: '#1D9E75',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            border: 'none',
            cursor: 'pointer'
          }}>
            Add to cart
          </button>
        </div>
      </div>

      {/* Eco grade section — will be filled on Day 4 */}
      <div style={{
        marginTop: '48px',
        background: '#F5F5F0',
        borderRadius: '16px',
        padding: '24px',
        textAlign: 'center',
        color: '#888'
      }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🤖</div>
        <p style={{ fontWeight: '500' }}>AI eco-grade breakdown coming on Day 4</p>
      </div>
    </div>
  )
}