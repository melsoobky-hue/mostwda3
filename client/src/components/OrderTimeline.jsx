export default function OrderTimeline({ order }) {
  if (!order) return null;

  const events = [
    { date: order.created_at, label: 'Order Created', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'var(--accent)' },
    order.order_date && { date: order.order_date, label: 'Order Placed', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', color: 'var(--info)' },
    order.shipped_date && { date: order.shipped_date, label: 'Shipped', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4', color: 'var(--warning)' },
    order.delivered_date && { date: order.delivered_date, label: 'Delivered', icon: 'M5 13l4 4L19 7', color: 'var(--success)' },
    order.status === 'Cancelled' && { date: order.updated_at, label: 'Cancelled', icon: 'M6 18L18 6M6 6l12 12', color: 'var(--danger)' },
    order.status === 'Returned' && { date: order.updated_at, label: 'Returned', icon: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6', color: 'var(--danger)' },
    order.is_delayed && order.delay_days > 0 && { date: null, label: `Delayed ${order.delay_days} days`, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'var(--danger)' },
  ].filter(Boolean);

  return (
    <div className="space-y-0">
      {events.map((ev, i) => (
        <div key={i} className="flex gap-3 relative">
          {i < events.length - 1 && (
            <div className="absolute left-[13px] top-[28px] w-[2px] h-[calc(100%-8px)]" style={{ background: 'var(--border)' }}></div>
          )}
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10" style={{ background: `${ev.color}20`, border: `2px solid ${ev.color}` }}>
            <svg className="w-3 h-3" fill="none" stroke={ev.color} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ev.icon} /></svg>
          </div>
          <div className="pb-4">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{ev.label}</p>
            {ev.date && <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{ev.date}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
