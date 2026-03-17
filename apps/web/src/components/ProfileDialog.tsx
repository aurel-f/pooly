import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { User } from '../types'

type Props = {
  user: User
  onSave: (firstName: string, currentPassword?: string, newPassword?: string) => Promise<void>
  onClose: () => void
}

export default function ProfileDialog({ user, onSave, onClose }: Props) {
  const [firstName, setFirstName] = useState(user.first_name)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const changingPassword = !!(currentPw || newPw || confirmPw)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (changingPassword) {
      if (!currentPw) { setError('Mot de passe actuel requis'); return }
      if (!newPw) { setError('Nouveau mot de passe requis'); return }
      if (newPw !== confirmPw) { setError('Les mots de passe ne correspondent pas'); return }
      if (newPw.length < 8 || !/[A-Z]/.test(newPw) || !/[0-9]/.test(newPw)) {
        setError('8 caractères min, une majuscule et un chiffre')
        return
      }
    }
    setLoading(true)
    try {
      await onSave(firstName, changingPassword ? currentPw : undefined, changingPassword ? newPw : undefined)
      setSuccess(true)
      setTimeout(onClose, 900)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      {/* Corps scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <Label htmlFor="prof-firstName">Prénom</Label>
          <Input
            id="prof-firstName"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            className="mt-1"
            placeholder="Votre prénom"
          />
        </div>

        <Separator />

        <div style={{ fontFamily: '"Sora", sans-serif', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Changer le mot de passe{' '}
          <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optionnel)</span>
        </div>

        <div>
          <Label htmlFor="prof-currentPw">Mot de passe actuel</Label>
          <Input
            id="prof-currentPw"
            type="password"
            value={currentPw}
            onChange={e => setCurrentPw(e.target.value)}
            className="mt-1"
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        <div>
          <Label htmlFor="prof-newPw">Nouveau mot de passe</Label>
          <Input
            id="prof-newPw"
            type="password"
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
            className="mt-1"
            placeholder="8 car. min, majuscule et chiffre"
            autoComplete="new-password"
          />
        </div>
        <div>
          <Label htmlFor="prof-confirmPw">Confirmer</Label>
          <Input
            id="prof-confirmPw"
            type="password"
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
            className="mt-1"
            placeholder="Confirmer le nouveau mot de passe"
            autoComplete="new-password"
          />
        </div>

        {error && (
          <p style={{ fontFamily: '"Sora", sans-serif', fontSize: 12, color: 'var(--status-danger-text)', margin: 0 }}>
            {error}
          </p>
        )}
        {success && (
          <p style={{ fontFamily: '"Sora", sans-serif', fontSize: 12, color: 'var(--status-ok-text)', margin: 0 }}>
            Enregistré ✓
          </p>
        )}
      </div>

      {/* Footer fixe — toujours visible */}
      <div style={{ flexShrink: 0, borderTop: '1px solid #f1f5f9', paddingTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </div>

    </form>
  )
}
