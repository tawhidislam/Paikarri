import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supplierActions, respondWarning, type SupplierWarning } from '@/lib/supplier-management';
import { useT } from '@/lib/i18n';
import { Field, Notice, State, useTitle } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { WarningCard, LocalPagination } from '@/components/supplier-warning';
export default function SupplierActions() {
  const tr = useT();
  useTitle(tr('Supplier action centre'));
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['supplier-actions', page],
    queryFn: () => supplierActions(page, 25),
    refetchInterval: 30000,
  });
  return (
    <div className="supplier-management">
      <header className="sm-heading">
        <span className="eyebrow">{tr('YOUR WORKSPACE')}</span>
        <h1>{tr('Supplier action centre')}</h1>
        <p>{tr('Read platform feedback, complete corrective actions, and send your response.')}</p>
      </header>
      {query.isPending && <State title="Loading…" />}
      <Notice error={query.error} />
      {query.error && (
        <Button variant="outline" onClick={() => query.refetch()}>
          {tr('Retry')}
        </Button>
      )}
      {query.data?.rows.map((warning) => (
        <WarningCard key={`${warning.id}:${warning.version}`} warning={warning}>
          {['open', 'response_submitted'].includes(warning.status) && (
            <Response warning={warning} />
          )}
        </WarningCard>
      ))}
      {query.data && !query.data.total && (
        <State
          title="No actions required"
          description="Platform warnings and corrective actions will appear here."
        />
      )}
      <LocalPagination page={page} setPage={setPage} total={query.data?.total ?? 0} />
    </div>
  );
}
function Response({ warning }: { warning: SupplierWarning }) {
  const tr = useT();
  const qc = useQueryClient();
  const [value, setValue] = useState('');
  const mutation = useMutation({
    mutationFn: () => respondWarning(warning, value),
    onSuccess: async () => {
      setValue('');
      await qc.invalidateQueries({ queryKey: ['supplier-actions'] });
    },
  });
  return (
    <form
      className="form-stack sm-response"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <Field label={tr('Your correction response')}>
        <textarea
          required
          minLength={5}
          maxLength={3000}
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </Field>
      <p className="sm-muted">
        {tr('Explain what you corrected. Do not include identity or bank account numbers.')}
      </p>
      <Notice error={mutation.error} />
      <Button disabled={mutation.isPending}>{tr('Submit response')}</Button>
    </form>
  );
}
