import { Spinner } from '@/components/atoms/spinner'

export function AnalysisPulse() {
  return (
    <div style={{ position: 'relative', width: 200, height: 200, marginBottom: 56 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'var(--accent)', opacity: 0.16,
          animation: `pulse-ring 1.8s ease-out ${i * 0.6}s infinite`,
        }} />
      ))}
      <div style={{
        position: 'absolute', inset: 36, borderRadius: '50%',
        background: 'var(--ink)', color: 'var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <Spinner size={52} color="var(--accent)" strokeWidth={2.2} />
      </div>
    </div>
  )
}
