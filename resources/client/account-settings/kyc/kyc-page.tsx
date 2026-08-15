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
  CheckIcon,
  FileClockIcon,
  FileX2Icon,
  IdCardIcon,
  UploadIcon,
  XIcon,
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

function VerificationDetails({verification}: {verification: KycVerification}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4 text-sm text-muted-foreground">
      <span>
        <Trans
          message="Document type: :type"
          values={{type: verification.document_type}}
        />
      </span>
      <span>
        <Trans
          message="Document number: :number"
          values={{number: verification.document_number}}
        />
      </span>
    </div>
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
      title={<Trans message="Submit for KYC Review" />}
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
      <form id={formId} onSubmit={onSubmit} className="flex flex-col gap-5">
        <Field.Root name="document_type">
          <Field.Label>
            <Trans message="ID type" />
          </Field.Label>
          <DocumentTypeTiles value={documentType} onChange={setDocumentType} />
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
            placeholder="e.g. 123456789"
          />
        </Field.Root>
        {documentType === 'passport' ? (
          <FileDropzone
            sample="passport"
            label={<Trans message="Passport" />}
            file={passportFile}
            setFile={setPassportFile}
          />
        ) : (
          <>
            <FileDropzone
              sample="id-front"
              label={<Trans message="Front of National ID" />}
              file={frontOfIdFile}
              setFile={setFrontOfIdFile}
            />
            <FileDropzone
              sample="id-back"
              label={<Trans message="Back of National ID" />}
              file={backOfIdFile}
              setFile={setBackOfIdFile}
            />
          </>
        )}
        {selfieRequired && (
          <FileDropzone
            sample="selfie"
            label={<Trans message="Selfie" />}
            description={
              <Trans message="A clear photo of your face, matching the document above." />
            }
            file={selfieFile}
            setFile={setSelfieFile}
          />
        )}
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted-foreground">
          <Checkbox
            className="mt-0.5"
            checked={termsAccepted}
            onCheckedChange={next => setTermsAccepted(next === true)}
            bindToHookForm={false}
          />
          <span>
            <Trans message="I confirm the submitted information is accurate and I consent to KYC verification." />
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
              'relative flex items-center gap-3 rounded-card border p-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
              selected
                ? 'border-primary bg-primary/5 text-foreground'
                : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <span
              className={cn(
                'grid size-9 shrink-0 place-items-center rounded-card-sm bg-background ring-1 ring-border [&>svg]:size-5',
                selected && 'text-primary',
              )}
            >
              {type.icon}
            </span>
            {type.label}
            {selected && (
              <span className="absolute top-2 right-2 grid size-4.5 place-items-center rounded-full bg-primary text-primary-foreground">
                <CheckIcon className="size-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

type DropzoneSample = 'passport' | 'id-front' | 'id-back' | 'selfie';

interface FileDropzoneProps {
  label: React.ReactNode;
  description?: React.ReactNode;
  file?: File;
  setFile: (value?: File) => void;
  sample: DropzoneSample;
}

function FileDropzone({
  label,
  description,
  file,
  setFile,
  sample,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  return (
    <Field.Root>
      <Field.Label>{label}</Field.Label>
      {description && <Field.Description>{description}</Field.Description>}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload file"
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
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border border-dashed p-6 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:bg-muted/50',
        )}
      >
        {file && previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt=""
              className="max-h-36 rounded-card-sm object-cover ring-1 ring-border"
            />
            <div className="flex items-center gap-2 text-sm">
              <span className="max-w-56 truncate font-medium">
                {file.name}
              </span>
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
            </div>
          </>
        ) : (
          <>
            <DocumentSample variant={sample} />
            <UploadIcon className="size-5 text-muted-foreground" />
            <p className="text-sm font-medium">
              <Trans message="Click to upload" />
              <span className="font-normal text-muted-foreground">
                {' '}
                <Trans message="or drag and drop" />
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              <Trans message="JPG, JPEG, PNG · Max 4 MB" />
            </p>
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

function DocumentSample({variant}: {variant: DropzoneSample}) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'size-20 text-muted-foreground/80',
    'aria-hidden': true,
  };

  if (variant === 'id-back') {
    return (
      <svg viewBox="0 0 120 75" xmlns="http://www.w3.org/2000/svg" {...common}>
        <rect
          x="2"
          y="2"
          width="116"
          height="71"
          rx="6"
          fill="currentColor"
          fillOpacity=".08"
        />
        <rect
          x="10"
          y="12"
          width="100"
          height="14"
          fill="currentColor"
          fillOpacity=".2"
          stroke="none"
        />
        <line x1="14" y1="36" x2="106" y2="36" />
        <line x1="14" y1="42" x2="100" y2="42" />
        <line x1="14" y1="48" x2="106" y2="48" />
        <g strokeWidth="2">
          <line x1="14" y1="58" x2="14" y2="68" />
          <line x1="18" y1="58" x2="18" y2="68" />
          <line x1="22" y1="58" x2="22" y2="68" />
          <line x1="28" y1="58" x2="28" y2="68" />
          <line x1="32" y1="58" x2="32" y2="68" />
          <line x1="38" y1="58" x2="38" y2="68" />
          <line x1="42" y1="58" x2="42" y2="68" />
          <line x1="48" y1="58" x2="48" y2="68" />
          <line x1="54" y1="58" x2="54" y2="68" />
        </g>
      </svg>
    );
  }

  if (variant === 'selfie') {
    return (
      <svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg" {...common}>
        <rect
          x="2"
          y="2"
          width="116"
          height="86"
          rx="10"
          fill="currentColor"
          fillOpacity=".08"
        />
        <circle cx="60" cy="32" r="13" />
        <path d="M28 74 a32 26 0 0 1 64 0" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg" {...common}>
      <path
        d="M30 8 h44 l24 24 v50 q0 4 -4 4 h-64 q-4 0 -4 -4 v-70 q0 -4 4 -4 z"
        fill="currentColor"
        fillOpacity=".08"
      />
      <path d="M74 8 v24 h24" />
      <line x1="36" y1="46" x2="92" y2="46" />
      <line x1="36" y1="54" x2="92" y2="54" />
      <line x1="36" y1="62" x2="86" y2="62" />
      <line x1="36" y1="70" x2="92" y2="70" />
    </svg>
  );
}