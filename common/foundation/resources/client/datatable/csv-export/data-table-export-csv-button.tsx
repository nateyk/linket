import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {downloadFileFromUrl} from '@ui/utils/files/download-file-from-url';
import {DownloadIcon} from 'lucide-react';
import {Fragment, useState} from 'react';
import {ExportCsvPayload, useExportCsv} from '../requests/use-export-csv';
import {CsvExportInfoDialog} from './csv-export-info-dialog';

interface DataTableExportCsvButtonProps {
  endpoint: string;
  payload?: ExportCsvPayload;
}
export function DataTableExportCsvButton({
  endpoint,
  payload,
}: DataTableExportCsvButtonProps) {
  const [dialogIsOpen, setDialogIsOpen] = useState(false);
  const exportCsv = useExportCsv(endpoint);

  return (
    <Fragment>
      <Button
        variant="outline"
        disabled={exportCsv.isPending}
        onClick={() => {
          exportCsv.mutate(payload, {
            onSuccess: response => {
              if (response.downloadPath) {
                downloadFileFromUrl(response.downloadPath);
              } else {
                setDialogIsOpen(true);
              }
            },
          });
        }}
      >
        <DownloadIcon />
        <Trans message="Export" />
      </Button>
      <CsvExportInfoDialog
        open={dialogIsOpen}
        onOpenChange={setDialogIsOpen}
      />
    </Fragment>
  );
}
