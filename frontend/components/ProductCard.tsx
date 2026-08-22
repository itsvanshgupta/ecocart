'use client'

import Link from 'next/link'
import EcoGradeBadge from './EcoGradeBadge'
import { Product } from '@/types'

interface Props {
  product: Product & {
    eco_scores?: { composite_grade: string; composite_score: number }[]
  }
}

export default function ProductCard({ product }: Props) {
  const grade = product.eco_scores?.[0]?.composite_grade as any || null

  return (
    <Link href={`/store/${product.id}`}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #E5E5E5',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
        }}
      >
        {/* Image */}
        <div style={{ position: 'relative', height: '200px', backgroundColor: '#F5F5F0' }}>
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
              justifyContent: 'center', fontSize: '40px'
            }}>🌿</div>
          )}
          {/* Grade badge on image */}
          {grade && (
            <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
              <EcoGradeBadge grade={grade} size="sm" />
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '12px' }}>
          <p style={{
            fontSize: '11px',
            color: '#1D9E75',
            fontWeight: '500',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '4px'
          }}>
            {product.category}
          </p>
          <h3 style={{
            fontSize: '15px',
            fontWeight: '500',
            color: '#1A1A1A',
            marginBottom: '8px',
            lineHeight: '1.3'
          }}>
            {product.name}
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '18px', fontWeight: '700', color: '#1A1A1A' }}>
              ${product.price}
            </span>
            {grade && <EcoGradeBadge grade={grade} size="sm" showLabel />}
          </div>
        </div>
      </div>
    </Link>
  )
}