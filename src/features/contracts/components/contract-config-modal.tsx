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
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatusMsg('Fetching contract data from Etherscan...');

    const payload = {
      contractNumber,
      contractAddress: contractAddress.trim(),
      gasLimit: 0,
    };

    try {
      const res = await fetch('/api/proxy/contracts/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setStatusMsg(`Error: ${err?.message || 'Failed to fetch contract data'}`);
        setLoading(false);
        return;
      }

      setStatusMsg('Contract added successfully!');

      // Trigger table refresh to reload data from backend
      window.dispatchEvent(new Event('contracts:refresh'));

      // Reset form after short delay so user sees the success message
      setTimeout(() => {
        setContractNumber('');
        setContractAddress('');
        setStatusMsg('');
        onClose();
      }, 800);
    } catch (err) {
      console.error(err);
      setStatusMsg('Network error — could not reach backend');
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
        </div>

        {statusMsg && (
          <div className={`mt-3 text-sm ${statusMsg.startsWith('Error') ? 'text-red-500' : 'text-blue-600'}`}>
            {statusMsg}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1 border rounded" disabled={loading}>{t('cancel')}</button>
          <button type="submit" className="px-4 py-1 bg-blue-600 text-white rounded" disabled={loading || !contractNumber || !contractAddress.trim()}>
            {loading ? 'Loading...' : t('apply')}
          </button>
        </div>
      </form>
    </div>
  );
}
