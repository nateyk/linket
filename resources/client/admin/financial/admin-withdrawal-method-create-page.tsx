import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Trans} from '@ui/i18n/trans';
import {ArrowLeftIcon, SaveIcon} from 'lucide-react';
import {useState} from 'react';
import {Link, useNavigate} from 'react-router';

export function Component() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [destinationLabel, setDestinationLabel] = useState('');
  const [instructions, setInstructions] = useState('');
  const [minimumAmountCents, setMinimumAmountCents] = useState('');
  const [maximumAmountCents, setMaximumAmountCents] = useState('');
  const [position, setPosition] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async () => {
    setSaving(true);
    setError(undefined);
    try {
      const response = await apiClient.post('/api/v1/admin/financial/withdrawal-methods', {
        name,
        destination_label: destinationLabel,
        instructions: instructions || undefined,
        minimum_amount_cents: dollarsToCents(minimumAmountCents),
        maximum_amount_cents: dollarsToCents(maximumAmountCents),
        position: position ? Number(position) : undefined,
        is_active: isActive,
      });
      const id = response.data?.data?.id;
      navigate(id ? `/admin/financial/withdrawal-methods/${id}/edit` : '/admin/financial/withdrawal-methods');
    } catch (e: unknown) {
      setError(extractError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <div>
          <DashboardLayout.SectionTitle>
            <Trans message="New withdrawal method" />
          </DashboardLayout.SectionTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <Trans message="Add a payout method creators can use for withdrawals." />
          </p>
        </div>
        <Button
          variant="outline"
          render={<Link to="/admin/financial/withdrawal-methods" />}
        >
          <ArrowLeftIcon />
          <Trans message="Withdrawal methods" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl py-6">
          {error && (
            <div className="mb-5 rounded-input border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Card.Root>
            <Card.Header>
              <Card.Title>
                <Trans message="Method details" />
              </Card.Title>
              <Card.Description>
                <Trans message="Configure how this payout method is presented to creators." />
              </Card.Description>
            </Card.Header>
            <Card.Content className="space-y-4">
              <Field.Root name="name">
                <Field.Label>
                  <Trans message="Name" />
                </Field.Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Bank Transfer"
                />
              </Field.Root>
              <Field.Root name="destination_label">
                <Field.Label>
                  <Trans message="Destination label" />
                </Field.Label>
                <Input
                  value={destinationLabel}
                  onChange={e => setDestinationLabel(e.target.value)}
                  placeholder="Bank account"
                />
                <Field.Description>
                  <Trans message="Shown next to the destination field in the withdrawal form." />
                </Field.Description>
              </Field.Root>
              <Field.Root name="instructions">
                <Field.Label>
                  <Trans message="Instructions (optional)" />
                </Field.Label>
                <Textarea
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  rows={4}
                  placeholder="e.g. Transfers are processed within 5 business days."
                />
              </Field.Root>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field.Root name="minimum_amount_cents">
                  <Field.Label>
                    <Trans message="Minimum amount" />
                  </Field.Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={minimumAmountCents}
                    onChange={e => setMinimumAmountCents(e.target.value)}
                    placeholder="0.00"
                  />
                </Field.Root>
                <Field.Root name="maximum_amount_cents">
                  <Field.Label>
                    <Trans message="Maximum amount" />
                  </Field.Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={maximumAmountCents}
                    onChange={e => setMaximumAmountCents(e.target.value)}
                    placeholder="Unlimited"
                  />
                </Field.Root>
              </div>
              <Field.Root name="position">
                <Field.Label>
                  <Trans message="Position" />
                </Field.Label>
                <Input
                  type="number"
                  value={position}
                  onChange={e => setPosition(e.target.value)}
                  placeholder="0"
                />
                <Field.Description>
                  <Trans message="Lower values are displayed first." />
                </Field.Description>
              </Field.Root>
              <Field.Root name="is_active">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                    className="size-4 accent-primary"
                  />
                  <Trans message="Active" />
                </label>
                <Field.Description>
                  <Trans message="Only active methods are shown to creators." />
                </Field.Description>
              </Field.Root>
            </Card.Content>
            <Card.Footer>
              <Button color="primary" disabled={saving} onClick={() => void submit()}>
                <SaveIcon />
                {saving ? (
                  <Trans message="Saving…" />
                ) : (
                  <Trans message="Save method" />
                )}
              </Button>
            </Card.Footer>
          </Card.Root>
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function dollarsToCents(value: string): number | undefined {
  return value ? Math.round(parseFloat(value) * 100) : undefined;
}

function extractError(e: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyError = e as any;
  const message = anyError?.response?.data?.message;
  const errors = anyError?.response?.data?.errors;
  if (errors) {
    return Object.values(errors).flat().join(' ');
  }
  return message ?? 'Unable to save this withdrawal method.';
}