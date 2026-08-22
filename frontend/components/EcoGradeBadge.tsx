'use client'

type Grade = 'A' | 'B' | 'C' | 'D' | 'F'

interface Props {
  grade: Grade
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const gradeConfig = {
  A: { bg: '#1D9E75', label: 'Excellent' },
  B: { bg: '#0F6E56', label: 'Good' },
  C: { bg: '#BA7517', label: 'Average' },
  D: { bg: '#E55A2B', label: 'Poor' },
  F: { bg: '#A32D2D', label: 'Bad' },
}

const sizeConfig = {
  sm: { box: 28, font: 13 },
  md: { box: 40, font: 18 },
  lg: { box: 56, font: 26 },
}

export default function EcoGradeBadge({
  grade,
  size = 'md',
  showLabel = false
}: Props) {
  const config = gradeConfig[grade] || gradeConfig['C']
  const dim = sizeConfig[size]

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: dim.box,
        height: dim.box,
        borderRadius: '8px',
        backgroundColor: config.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '700',
        fontSize: dim.font,
        color: 'white',
      }}>
        {grade}
      </div>
      {showLabel && (
        <span style={{ fontSize: 11, color: config.bg, fontWeight: '500' }}>
          {config.label}
        </span>
      )}
    </div>
  )
}