'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ContractConfigModal({ open, onClose }: Props) {
  const t = useTranslations('modal');
  const [contractNumber, setContractNumber] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [gasLimit, setGasLimit] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Simulate backend call: send contract config (address + gasLimit)
    const payload = {
      contractNumber,
      contractAddress,
      gasLimit: typeof gasLimit === 'number' ? gasLimit : Number(gasLimit),
    };

    try {
      // Send to Express backend via Next.js proxy
      await fetch('/api/proxy/contracts/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Trigger table refresh to reload real data from backend
      window.dispatchEvent(new Event('contracts:refresh'));

      // Reset form
      setContractNumber('');
      setContractAddress('');
      setGasLimit('');
      onClose();
    } catch (err) {
      console.error(err);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative bg-white rounded-lg shadow-lg p-6 w-96 z-10">
        <h3 className="text-lg font-semibold mb-4">{t('title')}</h3>
        <div className="space-y-3">
          <label className="block text-sm">{t('contractNumber')}</label>
          <input value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} className="w-full border px-3 py-2 rounded" placeholder={t('contractNumberPlaceholder')} />

          <label className="block text-sm">{t('contractAddress')}</label>
          <input value={contractAddress} onChange={(e) => setContractAddress(e.target.value)} className="w-full border px-3 py-2 rounded" placeholder={t('contractAddressPlaceholder')} />

          <label className="block text-sm">{t('gasLimit')}</label>
          <input value={gasLimit} onChange={(e) => setGasLimit(e.target.value === '' ? '' : Number(e.target.value))} type="number" step="0.0001" min="0" className="w-full border px-3 py-2 rounded" placeholder={t('gasLimitPlaceholder')} />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1 border rounded">{t('cancel')}</button>
          <button type="submit" className="px-4 py-1 bg-blue-600 text-white rounded" disabled={loading || !contractNumber}>{t('apply')}</button>
        </div>
      </form>
    </div>
  );
}
