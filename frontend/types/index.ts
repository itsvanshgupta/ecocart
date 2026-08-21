export interface Product {
  id: string
  name: string
  description: string
  category: string
  price: number
  images: string[]
  metadata: {
    materials: string
    origin_country: string
    packaging_type: string
    certifications: string[]
    lifespan_years: number
    weight_kg: number
  }
  created_at: string
}

export interface EcoGrade {
  composite_grade: 'A' | 'B' | 'C' | 'D' | 'F'
  composite_score: number
  grades: {
    materials: { grade: string; score: number; explanation: string }
    carbon_footprint: { grade: string; score: number; explanation: string }
    packaging: { grade: string; score: number; explanation: string }
    ethical_sourcing: { grade: string; score: number; explanation: string }
    durability: { grade: string; score: number; explanation: string }
  }
  summary: string
  top_strength: string
  top_concern: string
  greener_swap_hint: string
}

export interface GroupBuy {
  id: string
  product_id: string
  status: 'active' | 'completed' | 'expired'
  target_count: number
  current_count: number
  price_tiers: { min_members: number; price: number }[]
  expires_at: string
}

export interface Badge {
  id: string
  badge_type: string
  explanation: string
  earned_at: string
}

export interface CarbonLog {
  id: string
  product_id: string
  co2_saved_kg: number
  baseline_co2_kg: number
  packaging_choice: string
  purchase_date: string
}