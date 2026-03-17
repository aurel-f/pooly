import poolyLogo from '@/assets/pooly-logo.svg'
import poolySidebarLogo from '@/assets/pooly-logo-sidebar.svg'
import type { User } from '../types'
import type { Theme } from '../hooks/useTheme'
import { useInstallation } from '../context/InstallationContext'
import BottomNav from './BottomNav'

type Page = 'journal' | 'mesures' | 'historique'

function getIsDark(theme: Theme): boolean {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function ThemeSwitch({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const isDark = getIsDark(theme)
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark')
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 12px',
      margin: '0 8px',
    }}>
      <span style={{
        fontSize: '15px',
        opacity: isDark ? 0.35 : 1,
        transition: 'opacity 0.2s',
      }}>☀️</span>

      <div
        onClick={toggleTheme}
        style={{
          width: '52px',
          height: '28px',
          borderRadius: '100px',
          background: isDark ? 'rgba(56,189,248,0.12)' : '#1e3a5f',
          border: isDark ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(56,189,248,0.15)',
          boxShadow: isDark ? '0 0 10px rgba(56,189,248,0.1)' : 'none',
          position: 'relative',
          cursor: 'pointer',
          transition: 'background 0.3s, border-color 0.3s, box-shadow 0.3s',
          flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute',
          top: '4px',
          left: '4px',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: '#38bdf8',
          boxShadow: '0 1px 4px rgba(56,189,248,0.5)',
          transform: isDark ? 'translateX(24px)' : 'translateX(0)',
          transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }} />
      </div>

      <span style={{
        fontSize: '15px',
        opacity: isDark ? 1 : 0.35,
        transition: 'opacity 0.2s',
      }}>🌙</span>
    </div>
  )
}

type Props = {
  onAdd?: () => void
  onLogout?: () => void
  onProfile?: () => void
  onAddInstallation?: () => void
  page?: Page
  onNavigate?: (page: Page) => void
  user?: User
  theme?: Theme
  setTheme?: (t: Theme) => void
}

export default function Topbar({ onAdd, onLogout, onProfile, onAddInstallation, page = 'journal', onNavigate, user, theme = 'auto', setTheme }: Props) {
  const { installations, active, setActive } = useInstallation()

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="sidebar">
        <div style={{
          padding: '18px 16px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <img
            src={poolySidebarLogo}
            alt="Pooly"
            width={34}
            height={34}
            style={{ flexShrink: 0 }}
          />
          <div>
            <div style={{
              fontSize: '17px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              fontFamily: 'Sora, sans-serif',
            }}>
              <span style={{ color: 'white' }}>Pool</span>
              <span style={{ color: 'var(--accent)' }}>y</span>
            </div>
            <div style={{
              fontSize: '9px',
              color: 'rgba(255,255,255,0.3)',
              fontFamily: "'IBM Plex Mono', monospace",
              marginTop: '3px',
              letterSpacing: '0.04em',
            }}>
              {user?.first_name ? `BONJOUR ${user.first_name.toUpperCase()}` : 'MA PISCINE'}
            </div>
          </div>
        </div>

        {/* ── Installation selector ── */}
        {installations.length > 0 && (
          <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            {installations.length === 1 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 14 }}>{active?.type === 'spa' ? '🛁' : '🏊'}</span>
                <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {active?.name ?? '…'}
                </span>
              </div>
            ) : (
              <select
                value={active?.id ?? ''}
                onChange={e => setActive(Number(e.target.value))}
                style={{
                  width: '100%', padding: '5px 8px', borderRadius: 6,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
                  color: 'rgba(255,255,255,0.75)', fontFamily: 'Sora, sans-serif', fontSize: 12,
                  cursor: 'pointer', outline: 'none',
                }}
              >
                {installations.map(i => (
                  <option key={i.id} value={i.id} style={{ background: '#0f1a28' }}>
                    {i.type === 'spa' ? '🛁' : '🏊'} {i.name}
                  </option>
                ))}
              </select>
            )}
            {onAddInstallation && (
              <button
                onClick={onAddInstallation}
                style={{
                  marginTop: 6, width: '100%', background: 'none', border: 'none',
                  fontFamily: 'Sora, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.30)',
                  cursor: 'pointer', textAlign: 'left', padding: '2px 0',
                }}
              >
                + Ajouter une installation
              </button>
            )}
          </div>
        )}

        <nav className="sidebar-nav">
          <button
            className={`sidebar-nav-item${page === 'journal' ? ' active' : ''}`}
            onClick={() => onNavigate?.('journal')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Journal
          </button>

          <button
            className={`sidebar-nav-item${page === 'mesures' ? ' active' : ''}`}
            onClick={() => onNavigate?.('mesures')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            Mesures
          </button>

          <button
            className={`sidebar-nav-item${page === 'historique' ? ' active' : ''}`}
            onClick={() => onNavigate?.('historique')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Historique
          </button>
        </nav>

        <div className="sidebar-footer">
          {onAdd && (
            <button className="btn-sidebar-add" onClick={onAdd}>
              + Nouvelle entrée
            </button>
          )}
          {setTheme && <ThemeSwitch theme={theme} setTheme={setTheme} />}
          {onProfile && (
            <button className="btn-sidebar-logout" onClick={onProfile} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Mon profil
            </button>
          )}
          {onLogout && (
            <button className="btn-sidebar-logout" onClick={onLogout}>
              Déconnexion
            </button>
          )}
        </div>
      </aside>

      {/* ── Mobile top header ───────────────────────────────── */}
      <header className="mobile-header">
        <img src={poolyLogo} alt="Pooly" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onLogout && (
            <button className="mobile-header-logout" onClick={onLogout}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Déco
            </button>
          )}
        </div>
      </header>

      {/* ── Mobile bottom nav ───────────────────────────────── */}
      {onAdd && onNavigate && (
        <BottomNav page={page} onNavigate={onNavigate} onAdd={onAdd} />
      )}
    </>
  )
}
