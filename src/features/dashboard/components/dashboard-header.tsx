import { useTranslations } from 'next-intl';
import type { DashboardSummary } from '@/types';
import { LocaleSwitcher } from '@/components/ui/locale-switcher';

/**
 * Server Component: Renders the top header bar with ETH price, gas, and total airdrop.
 * SSR because this data is fetched once on page load and doesn't change frequently.
 */
interface DashboardHeaderProps {
  summary: DashboardSummary;
}

export function DashboardHeader({ summary }: DashboardHeaderProps) {
  const t = useTranslations('header');
  const isNegative = summary.ethPriceChange < 0;

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-eth-border">
      <div className="flex items-center gap-6">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1.5l-8 13.5 8 4.5 8-4.5L12 1.5zM12 22.5l-8-5.5 8 4.5 8-4.5-8 5.5z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900">{t('brand')}</span>
        </div>

        {/* ETH Price */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">{t('ethPrice')}:</span>
          <span className="font-semibold text-green-500">
            ${summary.ethPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className={`text-xs ${isNegative ? 'text-red-500' : 'text-green-500'}`}>
            ({isNegative ? '' : '+'}{summary.ethPriceChange}%)
          </span>
        </div>

        {/* Gas */}
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-gray-500">{t('gas')}:</span>
          <span className="font-semibold text-green-500">{summary.gasPrice} {t('gwei')}</span>
        </div>

        {/* Locale Switcher */}
        <LocaleSwitcher />
      </div>

      {/* Total Airdrop */}
      <div className="text-right">
        <span className="text-lg font-bold text-gray-900">
          {t('totalAirdrop')}：{summary.totalAirdropAmount.toLocaleString('en-US')}
        </span>
      </div>
    </header>
  );
}
