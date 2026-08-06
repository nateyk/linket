import {AccountSettingsPageLayout} from '@app/account-settings/account-settings-page-layout';
import {apiClient} from '@common/http/query-client';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {toast} from '@ui/toast/toast';
import {BadgeCheckIcon, FileCheck2Icon, FileClockIcon, FileX2Icon} from 'lucide-react';
import {FormEvent, useCallback, useEffect, useMemo, useState} from 'react';

type KycStatus = 'pending' | 'approved' | 'rejected';

type KycVerification = {
  id: number;
  document_type: 'national_id' | 'passport';
  document_number: string;
  status: KycStatus;
  rejection_reason?: string | null;
  created_at?: string;
  reviewed_at?: string | null;
  documents?: Record<string, string>;
};

type StatusResponse = {
  status: 'unsubmitted' | 'pending' | 'approved' | 'rejected';
  verification?: KycVerification;
};

export function Component() {
  const {kyc} = useSettings();
  const selfieRequired = kyc?.selfie_verification ?? true;
  const [status, setStatus] = useState<StatusResponse>();
  const [loading, setLoading] = useState(true);
  const [documentType, setDocumentType] = useState<'national_id' | 'passport'>(
    'national_id',
  );
  const [documentNumber, setDocumentNumber] = useState('');
  const [frontOfIdFile, setFrontOfIdFile] = useState<File>();
  const [backOfIdFile, setBackOfIdFile] = useState<File>();
  const [passportFile, setPassportFile] = useState<File>();
  const [selfieFile, setSelfieFile] = useState<File>();
  const [submitting, setSubmitting] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<StatusResponse>('/api/v1/kyc/status');
      setStatus(response.data);
    } catch {
      toast.danger(
        'Unable to load verification status. Please try again later.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set('document_type', documentType);
      formData.set('document_number', documentNumber);
      if (documentType === 'passport') {
        if (passportFile) formData.set('passport_file', passportFile);
      } else {
        if (frontOfIdFile) formData.set('front_of_id_file', frontOfIdFile);
        if (backOfIdFile) formData.set('back_of_id_file', backOfIdFile);
      }
      if (selfieRequired && selfieFile) {
        formData.set('selfie_file', selfieFile);
      }
      await apiClient.post('/api/v1/kyc', formData);
      toast.positive('Verification request submitted.');
      setDocumentNumber('');
      setFrontOfIdFile(undefined);
      setBackOfIdFile(undefined);
      setPassportFile(undefined);
      setSelfieFile(undefined);
      await loadStatus();
    } catch (err: any) {
      const message =
        err?.response?.data?.errors?.status?.[0] ||
        err?.response?.data?.message ||
        'Unable to submit verification request.';
      toast.danger(message);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = useMemo(
    () =>
      !loading &&
      status?.status !== 'pending' &&
      status?.status !== 'approved' &&
      !!documentNumber.trim() &&
      (documentType === 'passport' ? !!passportFile : !!frontOfIdFile && !!backOfIdFile) &&
      (!selfieRequired || !!selfieFile),
    [
      backOfIdFile,
      documentNumber,
      documentType,
      frontOfIdFile,
      loading,
      passportFile,
      selfieFile,
      selfieRequired,
      status,
    ],
  );

  return (
    <AccountSettingsPageLayout title={<Trans message="Verification" />}>
      {!loading && status?.status === 'approved' && (
        <ApprovedCard verification={status.verification} />
      )}
      {!loading && status?.status === 'pending' && (
        <PendingCard verification={status.verification} />
      )}
      {!loading && status?.status === 'rejected' && (
        <RejectedCard verification={status.verification} />
      )}
      {!loading &&
        (!status?.status || status.status === 'unsubmitted' || status.status === 'rejected') && (
          <SubmissionForm
            documentType={documentType}
            setDocumentType={setDocumentType}
            documentNumber={documentNumber}
            setDocumentNumber={setDocumentNumber}
            frontOfIdFile={frontOfIdFile}
            setFrontOfIdFile={setFrontOfIdFile}
            backOfIdFile={backOfIdFile}
            setBackOfIdFile={setBackOfIdFile}
            passportFile={passportFile}
            setPassportFile={setPassportFile}
            selfieFile={selfieFile}
            setSelfieFile={setSelfieFile}
            selfieRequired={selfieRequired}
            submitting={submitting}
            canSubmit={canSubmit}
            onSubmit={submit}
          />
        )}
    </AccountSettingsPageLayout>
  );
}

function StatusBadge({status}: {status: KycStatus}) {
  if (status === 'approved') {
    return (
      <Badge variant="positive">
        <BadgeCheckIcon />
        <Trans message="Approved" />
      </Badge>
    );
  }
  if (status === 'rejected') {
    return (
      <Badge variant="destructive">
        <FileX2Icon />
        <Trans message="Rejected" />
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      <FileClockIcon />
      <Trans message="Pending" />
    </Badge>
  );
}

function ApprovedCard({verification}: {verification?: KycVerification}) {
  return (
    <Card.Root className="mb-6">
      <Card.Header>
        <Card.Title>
          <BadgeCheckIcon className="size-5 text-primary" />
          <Trans message="You are verified" />
        </Card.Title>
        <Card.Description>
          <Trans message="Your identity has been verified. You are eligible for payouts and will be shown as a verified creator on your public pages." />
        </Card.Description>
      </Card.Header>
      {verification && (
        <Card.Content>
          <VerificationDetails verification={verification} />
        </Card.Content>
      )}
    </Card.Root>
  );
}

function PendingCard({verification}: {verification?: KycVerification}) {
  return (
    <Card.Root className="mb-6">
      <Card.Header>
        <Card.Title>
          <FileCheck2Icon className="size-5 text-primary" />
          <Trans message="Verification in progress" />
        </Card.Title>
        <Card.Description>
          <Trans message="Your verification request is being reviewed by our team. You will be notified once a decision has been made." />
        </Card.Description>
      </Card.Header>
      {verification && (
        <Card.Content>
          <VerificationDetails verification={verification} />
        </Card.Content>
      )}
    </Card.Root>
  );
}

function RejectedCard({verification}: {verification?: KycVerification}) {
  return (
    <Card.Root className="mb-6 border-destructive/40">
      <Card.Header>
        <Card.Title>
          <FileX2Icon className="size-5 text-destructive" />
          <Trans message="Verification rejected" />
        </Card.Title>
        <Card.Description>
          {verification?.rejection_reason ? (
            <Trans
              message="Reason: :reason"
              values={{reason: verification.rejection_reason}}
            />
          ) : (
            <Trans message="Your verification request was rejected. You can submit a new request below." />
          )}
        </Card.Description>
      </Card.Header>
      {verification && (
        <Card.Content>
          <VerificationDetails verification={verification} />
        </Card.Content>
      )}
    </Card.Root>
  );
}

function VerificationDetails({verification}: {verification: KycVerification}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <StatusBadge status={verification.status} />
      <span className="text-sm text-muted-foreground">
        <Trans message="Document type: :type" values={{type: verification.document_type}} />
      </span>
      <span className="text-sm text-muted-foreground">
        <Trans message="Document number: :number" values={{number: verification.document_number}} />
      </span>
    </div>
  );
}

interface SubmissionFormProps {
  documentType: 'national_id' | 'passport';
  setDocumentType: (value: 'national_id' | 'passport') => void;
  documentNumber: string;
  setDocumentNumber: (value: string) => void;
  frontOfIdFile?: File;
  setFrontOfIdFile: (value?: File) => void;
  backOfIdFile?: File;
  setBackOfIdFile: (value?: File) => void;
  passportFile?: File;
  setPassportFile: (value?: File) => void;
  selfieFile?: File;
  setSelfieFile: (value?: File) => void;
  selfieRequired: boolean;
  submitting: boolean;
  canSubmit: boolean;
  onSubmit: (e: FormEvent) => void;
}

function SubmissionForm({
  documentType,
  setDocumentType,
  documentNumber,
  setDocumentNumber,
  frontOfIdFile,
  setFrontOfIdFile,
  backOfIdFile,
  setBackOfIdFile,
  passportFile,
  setPassportFile,
  selfieFile,
  setSelfieFile,
  selfieRequired,
  submitting,
  canSubmit,
  onSubmit,
}: SubmissionFormProps) {
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>
          <Trans message="Verify your identity" />
        </Card.Title>
        <Card.Description>
          <Trans message="Verify your identity to request payouts and get the verified badge on your public pages. Your documents will be reviewed by our team." />
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <Field.Root name="document_type">
            <Field.Label>
              <Trans message="Document type" />
            </Field.Label>
            <Select
              value={documentType}
              onValueChange={value =>
                setDocumentType(value as 'national_id' | 'passport')
              }
            >
              <Select.Trigger />
              <Select.Content>
                <Select.Item value="national_id">
                  <Trans message="National ID" />
                </Select.Item>
                <Select.Item value="passport">
                  <Trans message="Passport" />
                </Select.Item>
              </Select.Content>
            </Select>
            <Field.Description>
              <Trans message="Passport is a single document, National ID requires front and back." />
            </Field.Description>
          </Field.Root>

          <Field.Root name="document_number">
            <Field.Label>
              <Trans message="Document number" />
            </Field.Label>
            <Input
              value={documentNumber}
              onChange={e => setDocumentNumber(e.target.value)}
              placeholder="123456789"
            />
          </Field.Root>

          {documentType === 'passport' ? (
            <FileField
              label={<Trans message="Passport" />}
              file={passportFile}
              setFile={setPassportFile}
            />
          ) : (
            <>
              <FileField
                label={<Trans message="Front of National ID" />}
                file={frontOfIdFile}
                setFile={setFrontOfIdFile}
              />
              <FileField
                label={<Trans message="Back of National ID" />}
                file={backOfIdFile}
                setFile={setBackOfIdFile}
              />
            </>
          )}

          {selfieRequired && (
            <FileField
              label={<Trans message="Selfie" />}
              description={
                <Trans message="A clear photo of your face, matching the document above." />
              }
              file={selfieFile}
              setFile={setSelfieFile}
            />
          )}

          <div>
            <Button
              type="submit"
              disabled={!canSubmit || submitting}
              color="primary"
            >
              {submitting ? (
                <Trans message="Submitting…" />
              ) : (
                <Trans message="Submit verification request" />
              )}
            </Button>
          </div>
        </form>
      </Card.Content>
    </Card.Root>
  );
}

interface FileFieldProps {
  label: React.ReactNode;
  description?: React.ReactNode;
  file?: File;
  setFile: (value?: File) => void;
}

function FileField({label, description, file, setFile}: FileFieldProps) {
  return (
    <Field.Root>
      <Field.Label>{label}</Field.Label>
      {description && <Field.Description>{description}</Field.Description>}
      <div className="flex items-center gap-3">
        <Input
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={e => setFile(e.target.files?.[0] ?? undefined)}
        />
        {file && (
          <span className="max-w-48 truncate text-sm text-muted-foreground">
            {file.name}
          </span>
        )}
      </div>
    </Field.Root>
  );
}
