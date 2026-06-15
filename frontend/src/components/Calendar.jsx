import { useState, useRef, useEffect } from 'react'

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]
const DAY_HEADERS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export default function Calendar({ selected, onSelect, minDate, maxDate }) {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const selectedDate = selected ? new Date(selected + 'T12:00:00') : today
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth())
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Sync view to selected date when it changes externally
  useEffect(() => {
    if (selected) {
      const d = new Date(selected + 'T12:00:00')
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }, [selected])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) }
    else setViewMonth(viewMonth - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) }
    else setViewMonth(viewMonth + 1)
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1)
  // getDay() = 0 (Sun) → we want Monday=0, so map: (d+6)%7
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const weeks = []
  let day = 1
  for (let w = 0; w < 6; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      if (w === 0 && d < startOffset) {
        // Previous month filler
        week.push(null)
      } else if (day > daysInMonth) {
        week.push(null)
      } else {
        week.push(day)
        day++
      }
    }
    if (week.some(x => x !== null)) weeks.push(week)
    else break
  }

  const isPast = (dayNum) => {
    if (!minDate) return false
    const d = new Date(viewYear, viewMonth, dayNum).toISOString().split('T')[0]
    return d < minDate
  }
  const isFuture = (dayNum) => {
    if (!maxDate) return false
    const d = new Date(viewYear, viewMonth, dayNum).toISOString().split('T')[0]
    return d > maxDate
  }

  const handleSelect = (dayNum) => {
    if (isPast(dayNum) || isFuture(dayNum)) return
    const y = viewYear
    const m = String(viewMonth + 1).padStart(2, '0')
    const d = String(dayNum).padStart(2, '0')
    onSelect(`${y}-${m}-${d}`)
    setOpen(false)
  }

  const selectedStr = selected || todayStr
  const displayDate = selected
    ? `${selectedDate.getDate()} ${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
    : `${today.getDate()} ${MONTHS[today.getMonth()]} ${today.getFullYear()}`

  const triggerIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )

  return (
    <div className="calendar-wrapper" ref={ref}>
      <button className="calendar-trigger" onClick={() => setOpen(!open)}>
        {triggerIcon}
        <span>{displayDate}</span>
      </button>

      {open && (
        <div className="calendar-popover">
          <div className="calendar-header">
            <button className="calendar-nav" onClick={prevMonth}>←</button>
            <span className="calendar-title">{MONTHS[viewMonth]} {viewYear}</span>
            <button className="calendar-nav" onClick={nextMonth}>→</button>
          </div>

          <div className="calendar-grid">
            {DAY_HEADERS.map(h => (
              <div key={h} className="calendar-day-header">{h}</div>
            ))}
            {weeks.flat().map((dayNum, i) => {
              if (dayNum === null) return <div key={`empty-${i}`} className="calendar-day empty" />

              const dStr = (() => {
                const y = viewYear
                const m = String(viewMonth + 1).padStart(2, '0')
                const dd = String(dayNum).padStart(2, '0')
                return `${y}-${m}-${dd}`
              })()

              const isToday = dStr === todayStr
              const isSel = dStr === selectedStr
              const disabled = isPast(dayNum) || isFuture(dayNum)

              let cls = 'calendar-day'
              if (isToday) cls += ' today'
              if (isSel) cls += ' selected'
              if (disabled) cls += ' disabled'

              return (
                <div
                  key={dStr}
                  className={cls}
                  onClick={() => !disabled && handleSelect(dayNum)}
                >
                  <span className="calendar-day-num">{dayNum}</span>
                  {isToday && !isSel && <span className="calendar-day-dot" />}
                </div>
              )
            })}
          </div>

          {!selected && (
            <div className="calendar-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => {
                onSelect(todayStr)
                setOpen(false)
              }}>
                Aujourd'hui
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
