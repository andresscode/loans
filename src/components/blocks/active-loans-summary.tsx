import { HandCoinsIcon, LandmarkIcon, PiggyBankIcon } from 'lucide-react'
import type { ActiveLoansSummary } from '@/types'
import { formatCop } from './amount-cell'
import DashboardCard from './dashboard-card'

type Props = {
  summary: ActiveLoansSummary | null
}

export function ActiveLoansSummaryCards({ summary }: Props) {
  const totalCapital = summary?.totalCapital ?? 0
  const totalExpectedInterest = summary?.totalExpectedInterest ?? 0
  const totalPaid = summary?.totalPaid ?? 0
  const totalPending = summary?.totalPending ?? 0
  const totalToCollect = totalCapital + totalExpectedInterest
  const collectedPct =
    totalToCollect > 0 ? Math.round((totalPaid / totalToCollect) * 100) : 0
  const loanCount = summary?.loanCount ?? 0

  return (
    <div className="my-4 flex justify-between gap-4">
      <DashboardCard
        description="Capital Prestado"
        title={formatCop(totalCapital)}
        subtitle={`+ ${formatCop(totalExpectedInterest)} en intereses esperados`}
        Icon={LandmarkIcon}
        iconColor="blue"
      />
      <DashboardCard
        description="Total Cobrado"
        title={formatCop(totalPaid)}
        subtitle={`de ${formatCop(totalToCollect)} (${collectedPct}%)`}
        Icon={PiggyBankIcon}
        iconColor="green"
      />
      <DashboardCard
        description="Pendiente por Cobrar"
        title={formatCop(totalPending)}
        subtitle={`en ${loanCount} ${loanCount === 1 ? 'préstamo activo' : 'préstamos activos'}`}
        Icon={HandCoinsIcon}
        iconColor="amber"
      />
    </div>
  )
}
