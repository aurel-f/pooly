const infos = [
  { title: 'Historique propre', text: 'Chaque action est datée, recherchable et exportable.' },
  { title: 'Adapté à ta piscine', text: 'Chlore, sel, brome, cartouche ou sable. Tout fonctionne.' },
  { title: 'Ultra rapide', text: 'Un formulaire court, un seul écran, rien de superflu.' },
]

export default function InfoGrid() {
  return (
    <section
      style={{ marginTop: 26, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 16 }}
      className="info-grid fade-up delay-3"
    >
      {infos.map(({ title, text }) => (
        <div
          key={title}
          style={{
            background: 'rgba(255,255,255,0.6)',
            borderRadius: 20,
            padding: 16,
            border: '1px solid #edf1f4',
          }}
        >
          <h3>{title}</h3>
          <p style={{ margin: 0, color: 'var(--pooly-muted)', fontSize: 13, lineHeight: 1.4 }}>{text}</p>
        </div>
      ))}
    </section>
  )
}
