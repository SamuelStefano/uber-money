import { ActivityRow } from '@/components/molecules/activity-row'
import type { ActivityItem } from '@/types/domain'

interface ActivityListProps {
  items: ActivityItem[]
}

export function ActivityList({ items }: ActivityListProps) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
        Atividade
      </div>
      {items.length === 0 ? (
        <div style={{
          padding: '40px 24px', textAlign: 'center',
          color: 'var(--mute-2)', fontSize: 14, fontWeight: 500,
          border: '1.5px dashed var(--line)', borderRadius: 24,
          background: '#fff',
        }}>
          Nada por aqui ainda. Quando você pedir crédito, vai aparecer aqui.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((a) => <ActivityRow key={a.id} item={a} />)}
        </div>
      )}
    </div>
  )
}
