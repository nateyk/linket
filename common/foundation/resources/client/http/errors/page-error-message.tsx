import {queryClient} from '@common/http/query-client';
import {Button} from '@shadcn/button/button';
import {Empty} from '@shadcn/empty/empty';
import {Trans} from '@ui/i18n/trans';
import {CircleAlertIcon} from 'lucide-react';
import {useState} from 'react';

export function PageErrorMessage() {
  const [isRetrying, setIsRetrying] = useState(false);
  const handleRetry = async () => {
    setIsRetrying(true);
    await queryClient.removeQueries();
    // Clearing the cache alone does not remount a failed route loader.
    window.location.reload();
  };

  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media>
          <CircleAlertIcon />
        </Empty.Media>
        <Empty.Title>
          <Trans message="There was an issue loading this page" />
        </Empty.Title>
        <Empty.Description>
          <Trans message="Please try again later" />
        </Empty.Description>
      </Empty.Header>
      <Empty.Content>
        <Button
          variant="outline"
          onClick={() => handleRetry()}
          disabled={isRetrying}
        >
          <Trans message="Retry" />
        </Button>
      </Empty.Content>
    </Empty.Root>
  );
}
