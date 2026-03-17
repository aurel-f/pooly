import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ActionForm from './ActionForm'

const products = [{ id: 1, name: 'Chlore', type: 'seed', unit_default: 'g' }]

describe('ActionForm', () => {
  it('calls onAdd with structured payload when submitted', () => {
    const onAdd = vi.fn()
    render(<ActionForm onAdd={onAdd} products={products} />)

    fireEvent.click(screen.getByText('Enregistrer'))

    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          action_type: expect.any(String),
          date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
      ])
    )
  })

  it('calls onClose after submit when provided', () => {
    const onAdd = vi.fn()
    const onClose = vi.fn()
    render(<ActionForm onAdd={onAdd} products={products} onClose={onClose} />)

    fireEvent.click(screen.getByText('Enregistrer'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
