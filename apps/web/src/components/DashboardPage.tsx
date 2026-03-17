import { useState, useMemo } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { Action, Product } from '../types'
import WaterStatusCard from './WaterStatusCard'
import { useInstallation } from '../context/InstallationContext'
import { useTheme, type Theme } from '../hooks/useTheme'

function getIsDark(theme: Theme): boolean {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}
import {
  extractMeasuredParams,
  getPhStatus,
  getChloreStatus,
  getBromeStatus,
  getTacStatus,
  getTempStatus,
  getPhHistory,
  getActionsThisMonth,
  getActionsLastMonth,
  daysSinceLastAction,
  getNextMeasureInDays,
  getTreatmentsThisMonth,
  getTodoItems,
} from '../utils'

const JOURS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const MOIS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

function formatDateLong(d: Date): string {
  return `${JOURS_FR[d.getDay()]} ${d.getDate()} ${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`
}

function formatShortDate(dateStr: string): string {
  const [, m, day] = dateStr.split('-')
  return `${day}/${m}`
}

type ParamStatus = 'normal' | 'warn' | 'bad'

function statusColors(s: ParamStatus): { color: string; bg: string } {
  if (s === 'normal') return { color: 'var(--status-ok-text)', bg: 'var(--status-ok-bg)' }
  if (s === 'warn') return { color: 'var(--status-warn-text)', bg: 'var(--status-warn-bg)' }
  return { color: 'var(--status-danger-text)', bg: 'var(--status-danger-bg)' }
}

function statusLabel(s: ParamStatus): string {
  if (s === 'normal') return 'Normal'
  if (s === 'warn') return 'À surveiller'
  return 'Hors norme'
}

type Props = {
  actions: Action[]
  products: Product[]
  onEdit: (action: Action) => void
  onDelete: (action: Action) => void
  onExport?: () => void
  onImport?: (file: File) => Promise<void>
}

export default function DashboardPage({ actions, products: _products, onEdit, onDelete, onExport, onImport }: Props) {
  const { active, ranges } = useInstallation()
  const { theme } = useTheme()
  const isDark = getIsDark(theme)
  const sanitizer = active?.sanitizer ?? 'chlore'
  const [showAll, setShowAll] = useState(false)

  const today = new Date()
  const yearMonth = today.toISOString().slice(0, 7)

  const params = useMemo(() => extractMeasuredParams(actions), [actions])
  const phHistory = useMemo(() => getPhHistory(actions, 10), [actions])
  const thisMonthActions = useMemo(() => getActionsThisMonth(actions, yearMonth), [actions, yearMonth])
  const lastMonthActions = useMemo(() => getActionsLastMonth(actions), [actions])
  const daysSince = useMemo(() => daysSinceLastAction(actions), [actions])
  const nextMeasure = useMemo(() => getNextMeasureInDays(actions), [actions])
  const treatments = useMemo(() => getTreatmentsThisMonth(actions, yearMonth), [actions, yearMonth])
  const todoItems = useMemo(() => getTodoItems(actions, params), [actions, params])

  // KPI: "dernière action" label
  function lastActionLabel(): string {
    if (actions.length === 0) return '—'
    if (daysSince === 0) return "Aujourd'hui"
    if (daysSince === 1) return 'Hier'
    return `Il y a ${daysSince} j`
  }

  function lastActionType(): string {
    if (actions.length === 0) return ''
    const sorted = [...actions].sort((a, b) => b.date.localeCompare(a.date))
    return sorted[0].action_type
  }

  // KPI: "prochaine mesure" value & color
  function nextMeasureLabel(): string {
    if (nextMeasure === null) return 'Jamais mesuré'
    if (nextMeasure < 0) return 'En retard'
    return `Dans ${nextMeasure} j`
  }

  function nextMeasureColor(): string {
    if (nextMeasure === null || nextMeasure <= 0) return 'var(--status-danger-text)'
    if (nextMeasure <= 2) return 'var(--status-warn-text)'
    return 'var(--text-primary)'
  }

  // KPI: actions vs last month comparison
  function vsLastMonth(): string {
    const diff = thisMonthActions.length - lastMonthActions.length
    if (diff > 0) return `+${diff} vs mois dernier`
    if (diff < 0) return `${diff} vs mois dernier`
    return '= mois dernier'
  }

  // pH chart scale: 6.0–9.0 → bar height 0–60px
  const PH_MIN = 6.0
  const PH_MAX = 9.0
  const CHART_HEIGHT = 60

  function phBarHeight(ph: number): number {
    const ratio = Math.max(0, Math.min(1, (ph - PH_MIN) / (PH_MAX - PH_MIN)))
    return Math.round(ratio * CHART_HEIGHT)
  }

  function phBarColor(ph: number): string {
    if (isDark) {
      return ph >= 7.0 && ph <= 7.6 ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.3)'
    }
    return ph >= 7.0 && ph <= 7.6 ? '#a7f3d0' : '#fde68a'
  }

  const [hoveredRowId, setHoveredRowId] = useState<number | null>(null)

  const displayedActions = useMemo(() => {
    const sorted = [...actions].sort((a, b) => b.date.localeCompare(a.date))
    return showAll ? sorted : sorted.slice(0, 5)
  }, [actions, showAll])

  // ── KPI card style ────────────────────────────────────────────────────────
  const kpiCardStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '14px 16px',
  }

  // ── Section card style ────────────────────────────────────────────────────
  const sectionCardStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '16px',
    marginBottom: 14,
  }

  return (
    <div>
      {/* En-tête */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: '"Sora", sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
          Journal
        </div>
        <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          {formatDateLong(today)}
        </div>
      </div>

      {/* KPI grid */}
      <div className="kpi-grid">
        {/* Actions ce mois */}
        <div style={kpiCardStyle}>
          <div className="kpi-label" style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Actions ce mois
          </div>
          <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '6px 0 4px' }}>
            {thisMonthActions.length}
          </div>
          <div style={{ fontFamily: '"Sora", sans-serif', fontSize: 11, color: 'var(--text-muted)' }}>
            {vsLastMonth()}
          </div>
        </div>

        {/* Dernière action */}
        <div style={kpiCardStyle}>
          <div className="kpi-label" style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Dernière action
          </div>
          <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '6px 0 4px' }}>
            {lastActionLabel()}
          </div>
          <div style={{ fontFamily: '"Sora", sans-serif', fontSize: 11, color: 'var(--text-muted)' }}>
            {lastActionType() || 'Aucune action'}
          </div>
        </div>

        {/* Prochaine mesure */}
        <div style={kpiCardStyle}>
          <div className="kpi-label" style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Prochaine mesure
          </div>
          <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 22, fontWeight: 700, color: nextMeasureColor(), margin: '6px 0 4px' }}>
            {nextMeasureLabel()}
          </div>
          <div style={{ fontFamily: '"Sora", sans-serif', fontSize: 11, color: 'var(--text-muted)' }}>
            Recommandé : tous les 7 jours
          </div>
        </div>

        {/* Traitements ce mois */}
        <div style={kpiCardStyle}>
          <div className="kpi-label" style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Traitements ce mois
          </div>
          <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '6px 0 4px' }}>
            {treatments.total}
          </div>
          <div style={{ fontFamily: '"Sora", sans-serif', fontSize: 11, color: 'var(--text-muted)' }}>
            {treatments.maintenance} entretien · {treatments.additions} ajouts
          </div>
        </div>
      </div>

      {/* Bandeau paramètres */}
      <div className="params-banner" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 0', display: 'flex', marginBottom: 14 }}>
        {/* pH */}
        <ParamBlock
          label="pH"
          value={params.ph !== null ? params.ph.toFixed(1) : '—'}
          unit=""
          status={params.ph !== null ? getPhStatus(params.ph, ranges ?? undefined) : null}
          showDivider={false}
        />
        {/* Chlore ou Brome selon désinfectant */}
        {sanitizer === 'brome' ? (
          <ParamBlock
            label="Brome total"
            value={params.brome !== null ? params.brome.toFixed(1) : '—'}
            unit="mg/L"
            status={params.brome !== null ? getBromeStatus(params.brome, ranges ?? undefined) : null}
            showDivider={true}
          />
        ) : (
          <ParamBlock
            label="Chlore libre"
            value={params.chlore !== null ? params.chlore.toFixed(1) : '—'}
            unit="mg/L"
            status={params.chlore !== null ? getChloreStatus(params.chlore, ranges ?? undefined) : null}
            showDivider={true}
          />
        )}
        {/* TAC */}
        <ParamBlock
          label="TAC"
          value={params.tac !== null ? String(Math.round(params.tac)) : '—'}
          unit="mg/L"
          status={params.tac !== null ? getTacStatus(params.tac, ranges ?? undefined) : null}
          showDivider={true}
        />
        {/* Température + date */}
        <div style={{ flex: 1, padding: '0 20px', borderLeft: '1px solid var(--border-subtle)', opacity: params.temp === null ? 0.5 : 1 }}>
          <div className="kpi-label" style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Température
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, margin: '6px 0 4px' }}>
            <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
              {params.temp !== null ? params.temp.toFixed(1) : '—'}
            </span>
            {params.temp !== null && (
              <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: 'var(--text-muted)' }}>°C</span>
            )}
          </div>
          {params.temp !== null && (
            <StatusBadge status={getTempStatus(params.temp, ranges ?? undefined)} />
          )}
          {params.date && (
            <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>
              Mesure du {formatShortDate(params.date)}
            </div>
          )}
        </div>
      </div>

      {/* Layout 2 colonnes */}
      <div className="dashboard-columns">
        {/* Colonne gauche */}
        <div>
          {/* Carte Historique récent */}
          <div style={sectionCardStyle}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontFamily: '"Sora", sans-serif', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                Historique récent
              </div>
              <button
                onClick={() => setShowAll(v => !v)}
                style={{
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: 11,
                  color: 'var(--accent)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {showAll ? 'Réduire ↑' : 'Voir tout →'}
              </button>
            </div>

            {actions.length === 0 ? (
              <p style={{ fontFamily: '"Sora", sans-serif', fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                Aucune action enregistrée.
              </p>
            ) : (
              <table className="history-table" style={{ marginBottom: 0 }}>
                <thead>
                  <tr>
                    <th style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Date</th>
                    <th style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Type</th>
                    <th className="history-col-params" style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Paramètres</th>
                    <th className="history-col-notes" style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {displayedActions.map(action => (
                    <tr
                      key={action.id}
                      onMouseEnter={() => setHoveredRowId(action.id)}
                      onMouseLeave={() => setHoveredRowId(null)}
                    >
                      <td style={{ fontFamily: '"Sora", sans-serif', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {formatShortDate(action.date)}
                      </td>
                      <td>
                        <ActionTypeBadge actionType={action.action_type} />
                      </td>
                      <td className="history-col-params">
                        <ActionParamPills action={action} />
                      </td>
                      <td className="history-col-notes" style={{ fontFamily: '"Sora", sans-serif', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {action.notes || '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 2, opacity: hoveredRowId === action.id ? 1 : 0, transition: 'opacity 0.15s' }}>
                          <button
                            onClick={() => onEdit(action)}
                            title="Modifier"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => onDelete(action)}
                            title="Supprimer"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Carte Évolution pH */}
          <div style={sectionCardStyle}>
            <div style={{ fontFamily: '"Sora", sans-serif', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
              Évolution du pH
            </div>
            {phHistory.length === 0 ? (
              <p style={{ fontFamily: '"Sora", sans-serif', fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                Aucune mesure pH enregistrée.
              </p>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                {phHistory.map((point, i) => {
                  const barH = phBarHeight(point.ph)
                  const color = phBarColor(point.ph)
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 32 }}>
                      <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {point.ph.toFixed(1)}
                      </div>
                      <div style={{
                        width: 24,
                        height: Math.max(barH, 4),
                        background: color,
                        borderRadius: '3px 3px 0 0',
                      }} />
                      <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>
                        {formatShortDate(point.date)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite */}
        <div>
          {/* WaterStatusCard */}
          <div style={{ marginBottom: 14 }}>
            <WaterStatusCard actions={actions} />
          </div>

          {/* Carte À faire */}
          <div style={sectionCardStyle}>
            <div style={{ fontFamily: '"Sora", sans-serif', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
              À faire
            </div>
            {todoItems.length === 0 ? (
              <p style={{ fontFamily: '"Sora", sans-serif', fontSize: 13, color: 'var(--status-ok-text)', margin: 0, textAlign: 'center' }}>
                Tout est à jour ✓
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {todoItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: item.iconBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      flexShrink: 0,
                    }}>
                      {item.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: '"Sora", sans-serif', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.title}
                      </div>
                      <div style={{ fontFamily: '"Sora", sans-serif', fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.subtitle}
                      </div>
                    </div>
                    <div style={{
                      fontFamily: '"IBM Plex Mono", monospace',
                      fontSize: 10,
                      color: item.isOverdue ? 'var(--status-danger-text)' : 'var(--text-muted)',
                      flexShrink: 0,
                    }}>
                      {item.delay}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sauvegardes */}
      {(onExport || onImport) && (
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginRight: 4 }}>
            Sauvegardes
          </span>
          {onExport && (
            <button
              onClick={onExport}
              style={{
                fontFamily: '"Sora", sans-serif', fontSize: 12, fontWeight: 600,
                color: 'var(--pooly-primary)', background: 'var(--bg-surface-2)',
                border: '1px solid var(--border)', borderRadius: 7,
                padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Exporter
            </button>
          )}
          {onImport && (
            <label
              style={{
                fontFamily: '"Sora", sans-serif', fontSize: 12, fontWeight: 600,
                color: 'var(--text-secondary)', background: 'var(--bg-surface-2)',
                border: '1px solid var(--border)', borderRadius: 7,
                padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Importer
              <input
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) { onImport(file); e.target.value = '' }
                }}
              />
            </label>
          )}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ParamBlock({
  label,
  value,
  unit,
  status,
  showDivider,
}: {
  label: string
  value: string
  unit: string
  status: ParamStatus | null
  showDivider: boolean
}) {
  const hasData = value !== '—'
  return (
    <div style={{
      flex: 1,
      padding: '0 20px',
      borderLeft: showDivider ? '1px solid var(--border-subtle)' : 'none',
      opacity: hasData ? 1 : 0.5,
    }}>
      <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, margin: '6px 0 4px' }}>
        <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
          {value}
        </span>
        {unit && hasData && (
          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: 'var(--text-muted)' }}>{unit}</span>
        )}
      </div>
      {status !== null && hasData && <StatusBadge status={status} />}
    </div>
  )
}

function StatusBadge({ status }: { status: ParamStatus }) {
  const { color, bg } = statusColors(status)
  return (
    <span style={{
      fontFamily: '"IBM Plex Mono", monospace',
      fontSize: 10,
      fontWeight: 600,
      color,
      background: bg,
      padding: '2px 6px',
      borderRadius: 4,
      display: 'inline-block',
    }}>
      {statusLabel(status)}
    </span>
  )
}

function ActionTypeBadge({ actionType }: { actionType: string }) {
  let color = 'var(--text-muted)', bg = 'var(--bg-surface-2)'
  if (actionType === 'Mesure' || actionType === 'Mesure de pH') {
    color = 'var(--badge-orange-text)'; bg = 'var(--badge-orange-bg)'
  } else if (actionType === 'Ajout de produit') {
    color = 'var(--badge-purple-text)'; bg = 'var(--badge-purple-bg)'
  } else if (
    actionType === 'Nettoyage cartouche' || actionType === 'Nettoyage filtre skimmer' ||
    actionType === 'Contre-lavage' || actionType === 'Calibrage pH'
  ) {
    color = 'var(--badge-blue-text)'; bg = 'var(--badge-blue-bg)'
  }
  return (
    <span style={{
      fontFamily: '"IBM Plex Mono", monospace',
      fontSize: 10, fontWeight: 600,
      color, background: bg,
      padding: '2px 6px', borderRadius: 4,
      display: 'inline-block', whiteSpace: 'nowrap',
    }}>
      {actionType}
    </span>
  )
}

function ActionParamPills({ action }: { action: Action }) {
  const p = extractMeasuredParams([action])
  const pills: Array<{ label: string; color: string; bg: string }> = []
  const styleMap = {
    normal: { color: 'var(--status-ok-text)',     bg: 'var(--status-ok-bg)'     },
    warn:   { color: 'var(--status-warn-text)',   bg: 'var(--status-warn-bg)'   },
    bad:    { color: 'var(--status-danger-text)', bg: 'var(--status-danger-bg)' },
  }
  if (p.ph !== null) {
    const s = getPhStatus(p.ph)
    pills.push({ label: `pH ${p.ph.toFixed(1)}`, ...styleMap[s] })
  }
  if (p.chlore !== null) {
    const s = getChloreStatus(p.chlore)
    pills.push({ label: `Cl ${p.chlore.toFixed(1)} mg/L`, ...styleMap[s] })
  }
  if (p.tac !== null) {
    const s = getTacStatus(p.tac)
    pills.push({ label: `TAC ${Math.round(p.tac)} mg/L`, ...styleMap[s] })
  }
  if (p.temp !== null) {
    const s = getTempStatus(p.temp)
    pills.push({ label: `T° ${p.temp.toFixed(1)} °C`, ...styleMap[s] })
  }
  if (pills.length === 0) {
    return <span style={{ color: 'var(--text-muted)', fontFamily: '"IBM Plex Mono", monospace', fontSize: 10 }}>—</span>
  }
  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
      {pills.map(pill => (
        <span key={pill.label} style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 10, fontWeight: 600,
          color: pill.color, background: pill.bg,
          padding: '2px 5px', borderRadius: 4,
          display: 'inline-block', whiteSpace: 'nowrap',
        }}>
          {pill.label}
        </span>
      ))}
    </div>
  )
}
