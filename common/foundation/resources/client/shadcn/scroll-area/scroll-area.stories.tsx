import preview from '@storybook/preview';

import {
  ScrollArea,
  ScrollAreaScrollBar,
  ScrollAreaViewport,
} from '@shadcn/scroll-area/scroll-area';
import {Separator} from '@shadcn/separator';
import {Fragment} from 'react/jsx-runtime';

const meta = preview.meta({
  title: 'Scroll Area',
  component: ScrollArea,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
});

const tags = Array.from({length: 50}).map(
  (_, i, a) => `v1.2.0-beta.${a.length - i}`,
);

export const ScrollAreaDemo = meta.story(() => {
  return (
    <ScrollArea className="h-72 w-48 rounded-md border">
      <ScrollAreaViewport>
        <div className="p-4">
          <h4 className="mb-4 text-sm leading-none font-medium">Tags</h4>
          {tags.map(tag => (
            <Fragment key={tag}>
              <div className="text-sm">{tag}</div>
              <Separator className="my-2" />
            </Fragment>
          ))}
        </div>
      </ScrollAreaViewport>
      <ScrollAreaScrollBar className="mx-2 my-3" onlyShowOnHover showTrack />
    </ScrollArea>
  );
});
