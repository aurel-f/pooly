import type { Action, Product } from '../types'
import StatBox from './StatBox'
import Timeline from './Timeline'
import { getActionsThisMonth, daysSinceLastAction, extractLastPh } from '../utils'

type Props = {
  actions: Action[]
  products: Product[]
  onOpenForm: () => void
}

export default function HeroCard({ actions, products, onOpenForm }: Props) {
  const yearMonth = new Date().toISOString().slice(0, 7)
  const thisMonth = getActionsThisMonth(actions, yearMonth).length
  const daysSince = daysSinceLastAction(actions)
  const lastPh = extractLastPh(actions)

  return (
    <div
      className="fade-up delay-1"
      style={{
        background: 'var(--pooly-card)',
        borderRadius: 28,
        padding: '28px 28px 24px',
        boxShadow: 'var(--shadow)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -80,
          right: -120,
          width: 260,
          height: 260,
          background: 'radial-gradient(circle, rgba(15,108,105,0.22) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <h1>Journal d'entretien de piscine, simple et beau.</h1>
      <div style={{ color: 'var(--pooly-muted)', fontSize: 16, marginBottom: 18 }}>
        Tout ce que tu fais pour ta piscine, au même endroit. Clair, rapide, propre.
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
          gap: 12,
          margin: '16px 0 4px',
        }}
      >
        <StatBox value={thisMonth} label="Actions ce mois" />
        <StatBox value={`${daysSince} j`} label="Depuis la dernière action" />
        <StatBox value={lastPh !== '—' ? `pH ${lastPh}` : '—'} label="Dernière mesure" />
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button className="btn primary" onClick={onOpenForm}>
          Ajouter une action
        </button>
        <button className="btn ghost">Voir l'historique</button>
      </div>

      <Timeline actions={actions.slice(0, 5)} products={products} />
    </div>
  )
}
