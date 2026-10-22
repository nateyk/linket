import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {useState} from 'react';
import {CheckIcon, ThumbsDownIcon, ThumbsUpIcon} from 'lucide-react';
import {reactToArticleOptions} from '../help-queries';

interface Props {
  slug: string;
  likes: number;
  dislikes: number;
}

export function ArticleFeedback({slug, likes, dislikes}: Props) {
  const [voted, setVoted] = useState(false);
  const react = useMutation(reactToArticleOptions(slug));
  const total = likes + dislikes;

  if (voted) {
    return (
      <p className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
        <CheckIcon className="size-4 text-green-600" />
        <Trans message="Thanks for your feedback!" />
      </p>
    );
  }

  return (
    <div className="text-center">
      <h3 className="mb-3 font-medium">
        <Trans message="Was this article helpful?" />
      </h3>
      <div className="mb-3 flex items-center justify-center gap-3">
        <Button
          variant="outline"
          disabled={react.isPending}
          onClick={() =>
            react.mutate(1, {
              onSuccess: r => {
                setVoted(true);
                toast(r.message);
              },
            })
          }
        >
          <ThumbsUpIcon className="size-4" />
          <Trans message="Yes" />
        </Button>
        <Button
          variant="outline"
          disabled={react.isPending}
          onClick={() =>
            react.mutate(2, {
              onSuccess: r => {
                setVoted(true);
                toast(r.message);
              },
            })
          }
        >
          <ThumbsDownIcon className="size-4" />
          <Trans message="No" />
        </Button>
      </div>
      {total > 0 && (
        <p className="mb-0 text-sm font-light text-muted-foreground">
          <Trans
            message=":count out of :total found this helpful"
            values={{count: likes, total}}
          />
        </p>
      )}
    </div>
  );
}
