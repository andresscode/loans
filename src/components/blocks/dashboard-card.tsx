import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card'

export type DashboardCardIconColor =
  | 'blue'
  | 'green'
  | 'amber'
  | 'red'
  | 'purple'
  | 'slate'

const iconColorClasses: Record<DashboardCardIconColor, string> = {
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  green:
    'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-500',
  red: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
  purple:
    'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

type Props = {
  description: string
  title: string
  subtitle?: string
  Icon?: LucideIcon
  iconColor?: DashboardCardIconColor
}

export default function DashboardCard({
  description,
  title,
  subtitle,
  Icon,
  iconColor = 'slate',
}: Props) {
  return (
    <Card className="w-full max-w-75">
      <CardHeader>
        <CardDescription>{description}</CardDescription>
        <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
          {title}
        </CardTitle>
        {subtitle && (
          <p className="text-muted-foreground text-xs tabular-nums">
            {subtitle}
          </p>
        )}
        {Icon && (
          <CardAction>
            <div
              className={cn(
                'flex size-10 items-center justify-center rounded-full',
                iconColorClasses[iconColor],
              )}
            >
              <Icon className="size-5" />
            </div>
          </CardAction>
        )}
      </CardHeader>
    </Card>
  )
}
