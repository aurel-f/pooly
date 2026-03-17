type Props = { value: string | number; label: string }

export default function StatBox({ value, label }: Props) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
