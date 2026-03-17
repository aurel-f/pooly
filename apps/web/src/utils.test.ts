import { describe, it, expect } from 'vitest'
import type { Action } from './types'
import { getActionsThisMonth, daysSinceLastAction, extractLastPh } from './utils'

const makeAction = (overrides: Partial<Action> = {}): Action => ({
  id: 1,
  date: '2026-02-24',
  action_type: 'Test',
  user_id: 1,
  product_id: null,
  qty: '',
  unit: '',
  notes: '',
  created_at: '2026-02-24T00:00:00',
  ...overrides,
})

describe('getActionsThisMonth', () => {
  it('returns actions matching the given year-month', () => {
    const actions = [
      makeAction({ id: 1, date: '2026-02-10' }),
      makeAction({ id: 2, date: '2026-01-15' }),
    ]
    expect(getActionsThisMonth(actions, '2026-02')).toHaveLength(1)
  })

  it('returns empty for no match', () => {
    const actions = [makeAction({ date: '2026-01-15' })]
    expect(getActionsThisMonth(actions, '2026-02')).toHaveLength(0)
  })
})

describe('daysSinceLastAction', () => {
  it('returns 0 for empty list', () => {
    expect(daysSinceLastAction([])).toBe(0)
  })
})

describe('extractLastPh', () => {
  it('returns — for empty list', () => {
    expect(extractLastPh([])).toBe('—')
  })

  it('returns — when no pH in notes', () => {
    const actions = [makeAction({ notes: 'eau claire' })]
    expect(extractLastPh(actions)).toBe('—')
  })

  it('extracts pH value from notes field', () => {
    const actions = [makeAction({ notes: 'pH 7.4, tout ok' })]
    expect(extractLastPh(actions)).toBe('7.4')
  })

  it('returns most recent pH when multiple actions', () => {
    const actions = [
      makeAction({ id: 1, date: '2026-02-24', notes: 'pH 7.4' }),
      makeAction({ id: 2, date: '2026-02-20', notes: 'pH 7.1' }),
    ]
    expect(extractLastPh(actions)).toBe('7.4')
  })
})
