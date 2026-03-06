'use client';

import { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ContractConfigModal({ open, onClose }: Props) {
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
      await fetch('/api/contracts/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Update local UI immediately: apply contractAddress and gasLimit to matching contract
      window.dispatchEvent(
        new CustomEvent('contracts:update', {
          detail: { contractNumber, updates: { contractAddress: payload.contractAddress, gasLimit: payload.gasLimit } },
        })
      );

      // Optionally trigger a refresh
      window.dispatchEvent(new Event('contracts:refresh'));

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
        <h3 className="text-lg font-semibold mb-4">Contract Config</h3>
        <div className="space-y-3">
          <label className="block text-sm">Contract Number</label>
          <input value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} className="w-full border px-3 py-2 rounded" placeholder="e.g. Eth_002" />

          <label className="block text-sm">Contract Address</label>
          <input value={contractAddress} onChange={(e) => setContractAddress(e.target.value)} className="w-full border px-3 py-2 rounded" placeholder="e.g. 0E0252" />

          <label className="block text-sm">Gas Limit (gwei)</label>
          <input value={gasLimit} onChange={(e) => setGasLimit(e.target.value === '' ? '' : Number(e.target.value))} type="number" step="0.0001" min="0" className="w-full border px-3 py-2 rounded" placeholder="e.g. 0.03" />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
          <button type="submit" className="px-4 py-1 bg-blue-600 text-white rounded" disabled={loading || !contractNumber}>Apply</button>
        </div>
      </form>
    </div>
  );
}
