import type { Action, Product } from '../types'
import ActionEntry from './ActionEntry'

type Props = {
  actions: Action[]
  products: Product[]
  onEdit?: (action: Action) => void
}

export default function Timeline({ actions, products, onEdit }: Props) {
  return (
    <table className="history-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Détail</th>
          <th>Notes</th>
          <th style={{ width: 36 }}></th>
        </tr>
      </thead>
      <tbody>
        {actions.map(action => (
          <ActionEntry key={action.id} action={action} products={products} onEdit={onEdit} />
        ))}
      </tbody>
    </table>
  )
}
