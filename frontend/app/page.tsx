import Link from 'next/link'

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)',
        padding: '80px 24px',
        textAlign: 'center',
        color: 'white'
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌿</div>
          <h1 style={{ fontSize: '48px', fontWeight: '700', marginBottom: '16px', lineHeight: 1.2 }}>
            Shop with the planet in mind
          </h1>
          <p style={{ fontSize: '18px', opacity: 0.9, marginBottom: '32px', lineHeight: 1.6 }}>
            Every product AI-graded for sustainability. See exactly why something is eco-friendly — or not.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/store">
              <button style={{
                padding: '14px 32px',
                borderRadius: '8px',
                backgroundColor: '#E55A2B',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer'
              }}>
                Browse Green Store
              </button>
            </Link>
            <Link href="/login">
              <button style={{
                padding: '14px 32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                border: '1px solid rgba(255,255,255,0.4)',
                cursor: 'pointer'
              }}>
                Get started free
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ padding: '64px 24px', maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '32px', fontWeight: '700', marginBottom: '48px' }}>
          Why EcoCart?
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px'
        }}>
          {[
            { icon: '🤖', title: 'AI Eco-Grading', desc: 'Claude grades every product A–F across 5 sustainability dimensions with plain-English explanations' },
            { icon: '🔍', title: 'Greener Alternatives', desc: 'Always see a greener version of what you\'re looking at, powered by semantic AI search' },
            { icon: '📊', title: 'Carbon Dashboard', desc: 'Track your personal CO₂ savings with real-world equivalencies updated after every purchase' },
            { icon: '👥', title: 'Group Buying', desc: 'Join others buying the same product — unlock lower prices and see your collective impact' },
          ].map((f, i) => (
            <div key={i} style={{
              background: '#F5F5F0',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>{f.icon}</div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>{f.title}</h3>
              <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}