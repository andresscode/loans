import {
  AlertCircleIcon,
  CalendarClockIcon,
  HandCoinsIcon,
  LandmarkIcon,
} from 'lucide-react'
import { parseLocalDate } from '@/lib/utils'
import type { WeeklyCollectionSummary } from '@/types'
import { formatCop } from './amount-cell'
import DashboardCard, { type DashboardCardIconColor } from './dashboard-card'

type Props = {
  summary: WeeklyCollectionSummary | null
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

// Days only up to a month, then months, then years — no weeks.
function formatDays(days: number): string {
  const d = Math.max(0, Math.round(days))
  if (d < 30) {
    return `${d} ${d === 1 ? 'día' : 'días'}`
  }
  if (d < 365) {
    const months = Math.round(d / 30)
    return `${months} ${months === 1 ? 'mes' : 'meses'}`
  }
  const years = Math.round(d / 365)
  return `${years} ${years === 1 ? 'año' : 'años'}`
}

export function WeeklyCollectionSummaryCards({ summary }: Props) {
  const expected = summary?.expected ?? 0
  const collected = summary?.collected ?? 0
  const remaining = summary?.remaining ?? 0
  const borrowerCount = summary?.borrowerCount ?? 0
  const paidCount = summary?.paidCount ?? 0
  const isPastWeek = summary?.isPastWeek ?? false
  const isCurrentWeek = summary?.isCurrentWeek ?? false

  const collectedPct =
    expected > 0 ? Math.round((collected / expected) * 100) : 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const weekStart = summary ? parseLocalDate(summary.weekStart) : today
  const weekEnd = summary ? parseLocalDate(summary.weekEnd) : today

  let thirdTitle: string
  let thirdSubtitle: string
  let thirdIcon = AlertCircleIcon
  let thirdColor: DashboardCardIconColor = 'amber'

  if (isPastWeek) {
    const daysAgo = Math.max(0, daysBetween(weekEnd, today))
    const ago = formatDays(daysAgo)
    thirdTitle = formatCop(remaining)
    thirdSubtitle = `Semana cerrada hace ${ago}`
    thirdColor = collected >= expected ? 'slate' : 'red'
  } else if (isCurrentWeek) {
    const daysLeft = Math.max(0, daysBetween(today, weekEnd))
    thirdTitle = formatCop(remaining)
    thirdSubtitle =
      daysLeft <= 0
        ? 'Último día para cobrar'
        : `Falta${daysLeft === 1 ? '' : 'n'} ${formatDays(daysLeft)} para cerrar la semana`
    thirdColor = 'amber'
  } else {
    const daysToStart = Math.max(0, daysBetween(today, weekStart))
    thirdTitle = formatCop(expected)
    thirdSubtitle =
      daysToStart <= 0
        ? 'La semana inicia hoy'
        : `Inicia en ${formatDays(daysToStart)}`
    thirdIcon = CalendarClockIcon
    thirdColor = 'slate'
  }

  const pagoS = paidCount === 1 ? '' : 's'
  const personaS = borrowerCount === 1 ? '' : 's'
  const collectedSubtitle = `en ${paidCount} pago${pagoS} recibido${pagoS} (${collectedPct}%)`
  const expectedSubtitle = `a ${borrowerCount} persona${personaS} esta semana`

  return (
    <div className="my-4 flex justify-between gap-4">
      <DashboardCard
        description="Total a cobrar"
        title={formatCop(expected)}
        subtitle={expectedSubtitle}
        Icon={LandmarkIcon}
        iconColor="blue"
      />
      <DashboardCard
        description="Total recaudado"
        title={formatCop(collected)}
        subtitle={collectedSubtitle}
        Icon={HandCoinsIcon}
        iconColor="purple"
      />
      <DashboardCard
        description="Pendiente por cobrar"
        title={thirdTitle}
        subtitle={thirdSubtitle}
        Icon={thirdIcon}
        iconColor={thirdColor}
      />
    </div>
  )
}
