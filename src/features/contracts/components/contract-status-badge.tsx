'use client';

import { useTranslations } from 'next-intl';
import type { ContractStatus } from '@/types';

const statusStyles: Record<ContractStatus, string> = {
  running: 'text-green-600',
  preparing: 'text-blue-600',
  ready: 'text-blue-500',
  limited: 'text-orange-500',
  stopped: 'text-red-500',
};

interface ContractStatusBadgeProps {
  status: ContractStatus;
}

export function ContractStatusBadge({ status }: ContractStatusBadgeProps) {
  const t = useTranslations('status');

  return (
    <span className={`font-medium ${statusStyles[status]}`}>
      {t(status)}
    </span>
  );
}
