import {DetailLayout} from '@app/dashboard/conversations/conversation-page/details-sidebar/conversation-general-details';
import {opacityAnimation} from '@ui/animation/opacity-animation';
import {Skeleton} from '@ui/skeleton/skeleton';
import {m} from 'framer-motion';

interface Props {
  isLoading: boolean;
}
export function ConversationDetailsSkeleton({isLoading}: Props) {
  return (
    <m.div
      key="chat-info-sidebar-skeleton"
      {...opacityAnimation}
      className="m-20"
    >
      <div className="mb-12 flex items-center gap-12 border-b pb-18">
        <Skeleton
          variant="avatar"
          radius="rounded-full"
          size="w-16 h-16"
          animation={isLoading ? 'wave' : null}
        />
        <div className="flex-auto">
          <Skeleton
            className="mb-2 max-w-20 text-base"
            animation={isLoading ? 'wave' : null}
          />
          <Skeleton
            className="max-w-50 text-sm"
            animation={isLoading ? 'wave' : null}
          />
          <Skeleton
            className="max-w-40 text-sm"
            animation={isLoading ? 'wave' : null}
          />
        </div>
      </div>
      <DetailLayout
        label={
          <Skeleton
            className="min-h-24 max-w-17.5 text-sm"
            animation={isLoading ? 'wave' : null}
          />
        }
        value={
          <Skeleton
            className="max-w-27.5"
            animation={isLoading ? 'wave' : null}
          />
        }
      />
      <DetailLayout
        label={
          <Skeleton
            className="min-h-24 max-w-12.5 text-sm"
            animation={isLoading ? 'wave' : null}
          />
        }
        value={
          <Skeleton
            className="max-w-20"
            animation={isLoading ? 'wave' : null}
          />
        }
      />
    </m.div>
  );
}
