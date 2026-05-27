import { ActivityRow } from '@/components/molecules/activity-row'
import { useUserHistory } from '@/hooks/use-user-history'

export function ActivityList() {
  const { items, loading, error } = useUserHistory()
  const showEmpty = !loading && items.length === 0

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Atividade
        </div>
        {loading && <span style={{ fontSize: 11, color: 'var(--mute-2)' }}>carregando…</span>}
        {error && <span style={{ fontSize: 11, color: '#C0392B' }}>erro ao carregar</span>}
      </div>
      {showEmpty ? (
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
