import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Columns3, Check } from 'lucide-react';
import { useComparison } from '@/lib/comparison';
import { useT } from '@/lib/i18n';
import { Button } from '../ui/button';
export function CompareButton({ id, compact = false }: { id: string; compact?: boolean }) {
  const { ids, toggle } = useComparison();
  const tr = useT();
  const [error, setError] = useState('');
  return (
    <div className={compact ? 'product-compare-control' : 'pd-compare-control'}>
      <Button
        className={compact ? 'product-compare-button' : undefined}
        title={tr(ids.includes(id) ? 'Remove from comparison' : 'Compare product')}
        aria-label={tr(ids.includes(id) ? 'Remove from comparison' : 'Compare product')}
        type="button"
        variant="outline"
        aria-pressed={ids.includes(id)}
        onClick={() => {
          try {
            toggle(id);
            setError('');
          } catch {
            setError(tr('Remove a product before adding another. You can compare four products.'));
          }
        }}
      >
        {compact && ids.includes(id) ? <Check size={17} /> : <Columns3 size={17} />}
        {!compact && tr(ids.includes(id) ? 'Remove from comparison' : 'Compare product')}
      </Button>
      {(compact ? ids.includes(id) : !!ids.length) && (
        <Link className={compact ? 'product-compare-count' : undefined} to="/compare">
          {tr('Compare')} ({ids.length}/4)
        </Link>
      )}
      {error && (
        <p className={compact ? 'product-compare-error' : undefined} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
