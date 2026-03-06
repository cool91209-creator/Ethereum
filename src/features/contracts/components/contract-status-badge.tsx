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
    <div className="flex items-center gap-1.5">
      <span className={`font-medium ${statusStyles[status]}`}>
        {t(status)}
      </span>
      <button className="text-gray-400 hover:text-gray-600" aria-label="Toggle visibility">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </button>
    </div>
  );
}
