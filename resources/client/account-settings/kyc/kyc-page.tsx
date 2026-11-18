import {AccountSettingsPageLayout} from '@app/account-settings/account-settings-page-layout';
import {AccountSettingsPanel} from '@common/auth/ui/account-settings/account-settings-panel';
import {apiClient} from '@common/http/query-client';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Checkbox} from '@shadcn/forms/checkbox/checkbox';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {toast} from '@ui/toast/toast';
import {cn} from '@ui/utils/cn';
import {
  BadgeCheckIcon,
  BookUserIcon,
  FileClockIcon,
  FileX2Icon,
  IdCardIcon,
  UploadIcon,
  UserRoundIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react';
import {
  FormEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

type KycStatus = 'pending' | 'approved' | 'rejected';

type KycDocumentType = 'national_id' | 'passport';

type KycVerification = {
  id: number;
  document_type: KycDocumentType;
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
  const [documentType, setDocumentType] = useState<KycDocumentType>(
    'national_id',
  );
  const [documentNumber, setDocumentNumber] = useState('');
  const [frontOfIdFile, setFrontOfIdFile] = useState<File>();
  const [backOfIdFile, setBackOfIdFile] = useState<File>();
  const [passportFile, setPassportFile] = useState<File>();
  const [selfieFile, setSelfieFile] = useState<File>();
  const [termsAccepted, setTermsAccepted] = useState(false);
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
      setTermsAccepted(false);
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
      termsAccepted &&
      (documentType === 'passport'
        ? !!passportFile
        : !!frontOfIdFile && !!backOfIdFile) &&
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
      termsAccepted,
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
        (!status?.status ||
          status.status === 'unsubmitted' ||
          status.status === 'rejected') && (
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
            termsAccepted={termsAccepted}
            setTermsAccepted={setTermsAccepted}
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
    <AccountSettingsPanel
      id="kyc-approved"
      title={<Trans message="You are verified" />}
      titleSuffix={<StatusBadge status="approved" />}
    >
      <p className="text-sm text-muted-foreground">
        <Trans message="Your identity has been verified. You are eligible for payouts and will be shown as a verified creator on your public pages." />
      </p>
      {verification && <VerificationDetails verification={verification} />}
    </AccountSettingsPanel>
  );
}

function PendingCard({verification}: {verification?: KycVerification}) {
  return (
    <AccountSettingsPanel
      id="kyc-pending"
      title={<Trans message="Verification in progress" />}
      titleSuffix={<StatusBadge status="pending" />}
    >
      <p className="text-sm text-muted-foreground">
        <Trans message="Your verification request is being reviewed by our team. You will be notified once a decision has been made." />
      </p>
      {verification && <VerificationDetails verification={verification} />}
    </AccountSettingsPanel>
  );
}

function RejectedCard({verification}: {verification?: KycVerification}) {
  return (
    <AccountSettingsPanel
      id="kyc-rejected"
      title={<Trans message="Verification rejected" />}
      titleSuffix={<StatusBadge status="rejected" />}
    >
      <p className="text-sm text-muted-foreground">
        {verification?.rejection_reason ? (
          <Trans
            message="Reason: :reason"
            values={{reason: verification.rejection_reason}}
          />
        ) : (
          <Trans message="Your verification request was rejected. You can submit a new request below." />
        )}
      </p>
      {verification && <VerificationDetails verification={verification} />}
    </AccountSettingsPanel>
  );
}

function documentTypeLabel(type: KycDocumentType) {
  return type === 'passport' ? (
    <Trans message="Passport" />
  ) : (
    <Trans message="National ID" />
  );
}

function VerificationDetails({verification}: {verification: KycVerification}) {
  return (
    <dl className="mt-4 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-1">
        <dt className="text-muted-foreground">
          <Trans message="Document type" />
        </dt>
        <dd className="font-medium">{documentTypeLabel(verification.document_type)}</dd>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <dt className="text-muted-foreground">
          <Trans message="Document number" />
        </dt>
        <dd className="truncate font-medium">{verification.document_number}</dd>
      </div>
    </dl>
  );
}

interface SubmissionFormProps {
  documentType: KycDocumentType;
  setDocumentType: (value: KycDocumentType) => void;
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
  termsAccepted: boolean;
  setTermsAccepted: (value: boolean) => void;
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
  termsAccepted,
  setTermsAccepted,
  submitting,
  canSubmit,
  onSubmit,
}: SubmissionFormProps) {
  const formId = useId();
  return (
    <AccountSettingsPanel
      id="kyc-submit"
      title={<Trans message="Verify your identity" />}
      actions={
        <Button
          type="submit"
          form={formId}
          variant="default"
          color="primary"
          size="sm"
          disabled={!canSubmit || submitting}
        >
          {submitting ? (
            <Trans message="Submitting…" />
          ) : (
            <>
              <UploadIcon />
              <Trans message="Submit for review" />
            </>
          )}
        </Button>
      }
    >
      <form id={formId} onSubmit={onSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          <Trans message="Upload a government ID so we can confirm your identity before payouts." />
        </p>
        <Field.Root name="document_type">
          <Field.Label>
            <Trans message="ID type" />
          </Field.Label>
          <DocumentTypeTiles value={documentType} onChange={setDocumentType} />
        </Field.Root>
        <Field.Root name="document_number">
          <Field.Label>
            <Trans message="Document number" />
          </Field.Label>
          <Input
            value={documentNumber}
            onChange={e => setDocumentNumber(e.target.value)}
            placeholder="e.g. 123456789"
          />
        </Field.Root>
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            <Trans message="JPG or PNG, up to 4 MB." />
          </p>
          {documentType === 'passport' ? (
            <FileDropzone
              label={<Trans message="Passport" />}
              uploadLabel="Upload passport"
              file={passportFile}
              setFile={setPassportFile}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <FileDropzone
                label={<Trans message="Front of National ID" />}
                uploadLabel="Upload front of National ID"
                file={frontOfIdFile}
                setFile={setFrontOfIdFile}
              />
              <FileDropzone
                label={<Trans message="Back of National ID" />}
                uploadLabel="Upload back of National ID"
                file={backOfIdFile}
                setFile={setBackOfIdFile}
              />
            </div>
          )}
          {selfieRequired && (
            <FileDropzone
              label={<Trans message="Selfie" />}
              description={
                <Trans message="A clear photo of your face, matching the document above." />
              }
              uploadLabel="Upload selfie"
              icon={UserRoundIcon}
              file={selfieFile}
              setFile={setSelfieFile}
            />
          )}
        </div>
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted-foreground">
          <Checkbox
            className="mt-0.5"
            checked={termsAccepted}
            onCheckedChange={next => setTermsAccepted(next === true)}
            bindToHookForm={false}
          />
          <span>
            <Trans message="I confirm the submitted information is accurate and I consent to identity verification." />
          </span>
        </label>
      </form>
    </AccountSettingsPanel>
  );
}

const DOCUMENT_TYPE_TILES: {
  value: KycDocumentType;
  label: React.ReactNode;
  icon: React.ReactNode;
}[] = [
  {
    value: 'national_id',
    label: <Trans message="National ID" />,
    icon: <IdCardIcon />,
  },
  {
    value: 'passport',
    label: <Trans message="Passport" />,
    icon: <BookUserIcon />,
  },
];

function DocumentTypeTiles({
  value,
  onChange,
}: {
  value: KycDocumentType;
  onChange: (value: KycDocumentType) => void;
}) {
  return (
    <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
      {DOCUMENT_TYPE_TILES.map(type => {
        const selected = value === type.value;
        return (
          <button
            key={type.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(type.value)}
            className={cn(
              'flex items-center gap-3 rounded-card-sm border px-3 py-2.5 text-start text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
              selected
                ? 'border-primary/60 bg-primary/5 text-foreground'
                : 'border-border text-muted-foreground hover:bg-muted/30 hover:text-foreground',
            )}
          >
            <span
              className={cn(
                'grid size-9 shrink-0 place-items-center rounded-card-sm bg-muted text-muted-foreground [&>svg]:size-4',
                selected && 'text-primary',
              )}
            >
              {type.icon}
            </span>
            {type.label}
          </button>
        );
      })}
    </div>
  );
}

interface FileDropzoneProps {
  label: React.ReactNode;
  description?: React.ReactNode;
  uploadLabel: string;
  icon?: LucideIcon;
  file?: File;
  setFile: (value?: File) => void;
}

function FileDropzone({
  label,
  description,
  uploadLabel,
  icon: Icon = UploadIcon,
  file,
  setFile,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <Field.Root>
      <Field.Label>{label}</Field.Label>
      {description && <Field.Description>{description}</Field.Description>}
      <div
        role="button"
        tabIndex={0}
        aria-label={uploadLabel}
        onClick={() => inputRef.current?.click()}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={e => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault();
          setDragOver(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) setFile(dropped);
        }}
        className={cn(
          'flex min-h-24 cursor-pointer items-center justify-center gap-3 rounded-card-sm border border-dashed px-4 py-4 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:bg-muted/30',
        )}
      >
        {file && previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt=""
              className="size-12 shrink-0 rounded-card-sm object-cover ring-1 ring-border"
            />
            <span className="min-w-0 truncate text-sm font-medium">{file.name}</span>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setFile(undefined);
              }}
              className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Remove file"
            >
              <XIcon className="size-3.5" />
            </button>
          </>
        ) : (
          <>
            <span className="grid size-9 shrink-0 place-items-center rounded-card-sm bg-muted text-muted-foreground">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span className="text-sm">
              <span className="font-medium">
                <Trans message="Click to upload" />
              </span>
              <span className="text-muted-foreground">
                {' '}
                <Trans message="or drag and drop" />
              </span>
            </span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          className="hidden"
          onChange={e => setFile(e.target.files?.[0] ?? undefined)}
        />
      </div>
    </Field.Root>
  );
}