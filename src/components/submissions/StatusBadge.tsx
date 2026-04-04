import type { SubmissionStatus } from '@/types'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: SubmissionStatus
  className?: string
}

const statusConfig: Record<
  SubmissionStatus,
  { label: string; className: string; dotClass: string }
> = {
  pending: {
    label: 'Pending Review',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    dotClass: 'bg-yellow-500',
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-100 text-green-800 border-green-200',
    dotClass: 'bg-green-500',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800 border-red-200',
    dotClass: 'bg-red-500',
  },
  live: {
    label: 'Live',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  expired: {
    label: 'Expired',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
    dotClass: 'bg-gray-400',
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dotClass)} />
      {config.label}
    </span>
  )
}
