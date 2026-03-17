import { useState, useMemo } from 'react'
import type { Action } from '../types'
import {
  PARAM_RANGES,
  getWaterStatus,
  getPhStatus,
  getChloreStatus,
  getTacStatus,
  getTempStatus,
  getPhHistory,
  getChloreHistory,
  getFilteredMeasureActions,
  getPhTrend,
  getDaysSince,
  extractMeasuredParams,
} from '../utils'

// ── Types ──────────────────────────────────────────────────────────────────

type Period = 1 | 3 | 6 | null
type ParamStatus = 'normal' | 'warn' | 'bad'

// ── Helpers ─────────────────────────────────────────────────────────────────

const MOIS_FR = [
  'jan', 'fév', 'mars', 'avr', 'mai', 'juin',
  'juil', 'août', 'sept', 'oct', 'nov', 'déc',
]

function formatShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${d}/${m}`
}

function formatDateFR(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${parseInt(d)} ${MOIS_FR[parseInt(m) - 1]} ${y}`
}

function valueColor(status: ParamStatus): string {
  if (status === 'normal') return 'var(--status-ok-text)'
  if (status === 'warn') return 'var(--status-warn-text)'
  return 'var(--status-danger-text)'
}

function cellValue(
  value: number | null,
  statusFn: (v: number) => ParamStatus,
  fmt: (v: number) => string,
): React.ReactNode {
  if (value === null) return <span style={{ color: 'var(--text-muted)', fontFamily: '"IBM Plex Mono", monospace', fontSize: 12 }}>—</span>
  const s = statusFn(value)
  return (
    <span style={{ color: valueColor(s), fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, fontWeight: 600 }}>
      {fmt(value)}
    </span>
  )
}

// ── Bar chart (CSS pure) ────────────────────────────────────────────────────

const CHART_H = 72

type BarChartProps = {
  bars: { date: string; value: number; colorClass: string; label: string }[]
  empty: string
}

function BarChart({ bars, empty }: BarChartProps) {
  if (bars.length === 0) {
    return (
      <p style={{ fontFamily: '"Sora", sans-serif', fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
        {empty}
      </p>
    )
  }
  if (bars.length < 2) {
    return (
      <p style={{ fontFamily: '"Sora", sans-serif', fontSize: 12, color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
        Pas assez de données pour afficher une tendance
      </p>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
      {bars.map((b, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 30 }}>
          <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 3 }}>
            {b.label}
          </div>
          <div className={b.colorClass} style={{ width: 22, height: Math.max(b.value, 4), borderRadius: '3px 3px 0 0' }} />
          <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 8, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>
            {formatShort(b.date)}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ ph, chlore, tac }: { ph: number | null; chlore: number | null; tac: number | null }) {
  const { status, hasData } = getWaterStatus({ ph, chlore, tac })
  if (!hasData) return <span style={{ color: 'var(--text-muted)', fontFamily: '"IBM Plex Mono", monospace', fontSize: 10 }}>—</span>
  const cfg = {
    clear:  { label: 'Normal',       color: 'var(--status-ok-text)',     bg: 'var(--status-ok-bg)'     },
    cloudy: { label: 'À surveiller', color: 'var(--status-warn-text)',   bg: 'var(--status-warn-bg)'   },
    green:  { label: 'Hors norme',   color: 'var(--status-danger-text)', bg: 'var(--status-danger-bg)' },
  }[status]
  return (
    <span style={{
      fontFamily: '"IBM Plex Mono", monospace',
      fontSize: 10, fontWeight: 600,
      color: cfg.color, background: cfg.bg,
      padding: '2px 6px', borderRadius: 4, display: 'inline-block', whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}

// ── Card & KPI styles ──────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 10,
}

const kpiLabel: React.CSSProperties = {
  fontFamily: '"IBM Plex Mono", monospace',
  fontSize: 9,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  color: 'var(--text-muted)',
}

const kpiValue: React.CSSProperties = {
  fontFamily: '"IBM Plex Mono", monospace',
  fontSize: 20,
  fontWeight: 700,
  color: 'var(--text-primary)',
  margin: '6px 0 4px',
  lineHeight: 1.2,
}

const kpiSub: React.CSSProperties = {
  fontFamily: '"Sora", sans-serif',
  fontSize: 11,
  color: 'var(--text-muted)',
}

// ── Period filter ──────────────────────────────────────────────────────────

const PERIODS: { label: string; value: Period }[] = [
  { label: 'Ce mois', value: 1 },
  { label: '3 mois',  value: 3 },
  { label: '6 mois',  value: 6 },
  { label: 'Tout',    value: null },
]

// ── Main component ─────────────────────────────────────────────────────────

type Props = { actions: Action[] }

export default function MesuresPage({ actions }: Props) {
  const [period, setPeriod] = useState<Period>(1)

  const today = new Date()
  const yearMonth = today.toISOString().slice(0, 7)

  // KPI 1: mesures ce mois
  const measuresThisMonth = useMemo(() =>
    actions.filter(a => {
      const isMeasure = a.action_type === 'Mesure' || a.action_type === 'Mesure de pH'
      return isMeasure && a.date.startsWith(yearMonth)
    }).length
  , [actions, yearMonth])

  // KPI 2: tendance pH ce mois
  const phTrend = useMemo(() => getPhTrend(actions, yearMonth), [actions, yearMonth])

  // KPI 3: dernier relevé
  const lastMeasure = useMemo(() => {
    const ms = actions
      .filter(a => a.action_type === 'Mesure' || a.action_type === 'Mesure de pH')
      .sort((a, b) => b.date.localeCompare(a.date))
    return ms[0] ?? null
  }, [actions])

  // Filtered set (graphs + table)
  const filtered = useMemo(() => getFilteredMeasureActions(actions, period), [actions, period])

  // pH chart bars (last 7) — fixed scale 6.0–9.0
  const phBars = useMemo(() => {
    const pts = getPhHistory(filtered, 7)
    const PH_MIN = 6.0, PH_MAX = 9.0
    return pts.map(p => {
      const ratio = Math.max(0, Math.min(1, (p.ph - PH_MIN) / (PH_MAX - PH_MIN)))
      const h = Math.max(Math.round(ratio * CHART_H), 4)
      const [iMin, iMax] = PARAM_RANGES.ph.ideal
      const [aMin, aMax] = PARAM_RANGES.ph.acceptable
      const colorClass = (p.ph >= iMin && p.ph <= iMax) ? 'bar-ok'
        : (p.ph >= aMin && p.ph <= aMax) ? 'bar-warn'
        : 'bar-danger'
      return { date: p.date, value: h, colorClass, label: p.ph.toFixed(1) }
    })
  }, [filtered])

  // Chlore chart bars (last 7)
  const clBars = useMemo(() => {
    const pts = getChloreHistory(filtered, 7)
    const CL_MAX = 5
    return pts.map(p => {
      const ratio = Math.max(0, Math.min(1, p.chlore / CL_MAX))
      const h = Math.max(Math.round(ratio * CHART_H), 4)
      const [iMin, iMax] = PARAM_RANGES.chlore.ideal
      const [aMin, aMax] = PARAM_RANGES.chlore.acceptable
      const colorClass = (p.chlore >= iMin && p.chlore <= iMax) ? 'bar-ok'
        : (p.chlore >= aMin && p.chlore <= aMax) ? 'bar-warn'
        : 'bar-danger'
      return { date: p.date, value: h, colorClass, label: p.chlore.toFixed(1) }
    })
  }, [filtered])

  // Table rows: one per measure action with at least one param, newest first
  const tableRows = useMemo(() =>
    filtered
      .map(a => {
        const p = extractMeasuredParams([a])
        return { action: a, ph: p.ph, chlore: p.chlore, tac: p.tac, temp: p.temp }
      })
      .filter(r => r.ph !== null || r.chlore !== null || r.tac !== null || r.temp !== null)
  , [filtered])

  // ── Trend sub-text ────────────────────────────────────────────────────────
  function trendNode() {
    if (!phTrend) return <span style={kpiSub}>Pas assez de données</span>
    const { trend } = phTrend
    const cfg = {
      up:     { icon: '↑', label: 'En amélioration', color: 'var(--status-ok-text)'     },
      down:   { icon: '↓', label: 'En baisse',        color: 'var(--status-danger-text)' },
      stable: { icon: '→', label: 'Stable',           color: 'var(--text-muted)'         },
    }[trend]
    return (
      <span style={{ ...kpiSub, color: cfg.color, fontWeight: 500 }}>
        {cfg.icon} {cfg.label}
      </span>
    )
  }

  return (
    <div>
      {/* En-tête */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: '"Sora", sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
          Mesures
        </div>
        <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          Suivi des paramètres de qualité de l'eau
        </div>
      </div>

      {/* ── Zone 1 : KPIs ───────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>

        {/* KPI 1 */}
        <div style={{ ...card, padding: '12px 14px' }}>
          <div style={kpiLabel}>Mesures ce mois</div>
          <div style={kpiValue}>{measuresThisMonth}</div>
          <div style={kpiSub}>relevés enregistrés</div>
        </div>

        {/* KPI 2 — Tendance pH */}
        <div style={{ ...card, padding: '12px 14px' }}>
          <div style={kpiLabel}>Tendance pH</div>
          {phTrend ? (
            <div style={{ ...kpiValue, fontSize: 16 }}>
              {phTrend.first.toFixed(1)} → {phTrend.last.toFixed(1)}
            </div>
          ) : (
            <div style={{ ...kpiValue, fontSize: 16, color: 'var(--text-muted)' }}>—</div>
          )}
          {trendNode()}
        </div>

        {/* KPI 3 — Dernier relevé */}
        <div style={{ ...card, padding: '12px 14px' }}>
          <div style={kpiLabel}>Dernier relevé complet</div>
          {lastMeasure ? (
            <>
              <div style={{ ...kpiValue, fontSize: 16 }}>{formatDateFR(lastMeasure.date)}</div>
              <div style={kpiSub}>
                {(() => { const n = getDaysSince(lastMeasure.date); return n === 0 ? "Aujourd'hui" : n === 1 ? 'Il y a 1 jour' : `Il y a ${n} jours` })()}
              </div>
            </>
          ) : (
            <>
              <div style={{ ...kpiValue, color: 'var(--text-muted)' }}>—</div>
              <div style={kpiSub}>Aucun relevé</div>
            </>
          )}
        </div>
      </div>

      {/* ── Filtres de période ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {PERIODS.map(p => {
          const active = p.value === period
          return (
            <button
              key={String(p.value)}
              onClick={() => setPeriod(p.value)}
              style={{
                fontFamily: '"Sora", sans-serif',
                fontSize: 12,
                fontWeight: 500,
                padding: '5px 12px',
                borderRadius: 7,
                border: '1px solid var(--border)',
                cursor: 'pointer',
                background: active ? 'var(--text-primary)' : 'var(--bg-surface)',
                color: active ? 'var(--bg-surface)' : 'var(--text-muted)',
                transition: 'background 0.12s, color 0.12s',
              }}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {/* ── Zone 2 : Graphiques ─────────────────────────────────────────── */}
      <div className="mesures-charts">

        {/* Graphique pH */}
        <div style={{ ...card, padding: 16 }}>
          <div style={{ fontFamily: '"Sora", sans-serif', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
            Évolution pH
          </div>
          <BarChart bars={phBars} empty="Aucune mesure pH dans cette période." />
        </div>

        {/* Graphique Chlore */}
        <div style={{ ...card, padding: 16 }}>
          <div style={{ fontFamily: '"Sora", sans-serif', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
            Évolution chlore libre
          </div>
          <BarChart bars={clBars} empty="Aucune mesure chlore dans cette période." />
        </div>
      </div>

      {/* ── Zone 3 : Tableau ────────────────────────────────────────────── */}
      <div style={{ ...card, padding: 16, marginTop: 14 }}>
        {/* En-tête tableau */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontFamily: '"Sora", sans-serif', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
            Tous les relevés
          </div>
          <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: 'var(--text-muted)' }}>
            {tableRows.length} mesure{tableRows.length !== 1 ? 's' : ''}
          </div>
        </div>

        {tableRows.length === 0 ? (
          <p style={{ fontFamily: '"Sora", sans-serif', fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Aucun relevé dans cette période.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="mesures-table">
              <thead>
                <tr>
                  {['Date', 'pH', 'Chlore libre', 'TAC', 'Température', 'Statut'].map(col => (
                    <th key={col} style={{
                      fontFamily: '"IBM Plex Mono", monospace',
                      fontSize: 10, fontWeight: 500,
                      textTransform: 'uppercase', color: 'var(--text-muted)',
                      textAlign: 'left', padding: '0 8px 8px 0',
                      borderBottom: '1px solid var(--border-subtle)',
                      whiteSpace: 'nowrap',
                    }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map(({ action, ph, chlore, tac, temp }) => (
                  <tr key={action.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '9px 8px 9px 0', fontFamily: '"Sora", sans-serif', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {formatShort(action.date)}
                    </td>
                    <td style={{ padding: '9px 8px 9px 0' }}>
                      {cellValue(ph, getPhStatus, v => v.toFixed(1))}
                    </td>
                    <td style={{ padding: '9px 8px 9px 0' }}>
                      {cellValue(chlore, getChloreStatus, v => `${v.toFixed(1)} mg/L`)}
                    </td>
                    <td style={{ padding: '9px 8px 9px 0' }}>
                      {cellValue(tac, getTacStatus, v => `${Math.round(v)} mg/L`)}
                    </td>
                    <td style={{ padding: '9px 8px 9px 0' }}>
                      {cellValue(temp, getTempStatus, v => `${v.toFixed(1)} °C`)}
                    </td>
                    <td style={{ padding: '9px 8px 9px 0' }}>
                      <StatusBadge ph={ph} chlore={chlore} tac={tac} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

