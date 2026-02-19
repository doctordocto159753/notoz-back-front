import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

export function getDayRange(tz: string, isoDate?: string) {
  const base = isoDate ? dayjs.tz(isoDate, tz) : dayjs().tz(tz)
  const start = base.startOf('day')
  const end = base.endOf('day')

  // toDate() -> UTC instant
  return { start: start.toDate(), end: end.toDate(), now: base.toDate() }
}

export function computeNextRepeat(at: Date, repeat: 'none' | 'daily' | 'weekly') {
  if (repeat === 'none') return null
  const d = dayjs(at)
  if (repeat === 'daily') return d.add(1, 'day').toDate()
  return d.add(1, 'week').toDate()
}
