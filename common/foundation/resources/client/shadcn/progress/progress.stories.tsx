import {Progress} from '@shadcn/progress/progress';
import preview from '@storybook/preview';
import {useEffect, useState} from 'react';

const meta = preview.meta({
  title: 'Progress',
  component: Progress,
  tags: ['autodocs'],
});

export const ProgressDemo = meta.story(() => {
  const [progress, setProgress] = useState(13);
  useEffect(() => {
    const timer = setTimeout(() => setProgress(66), 500);
    return () => clearTimeout(timer);
  }, []);
  return (
    <Progress.Root value={progress} className="w-[60%]">
      <Progress.Label>Upload progress</Progress.Label>
      <Progress.Value />
      <Progress.Track>
        <Progress.Indicator />
      </Progress.Track>
    </Progress.Root>
  );
});

export const ProgressWithLabel = meta.story(() => {
  return (
    <Progress.Root value={56} className="w-full max-w-sm">
      <Progress.Label>Upload progress</Progress.Label>
      <Progress.Value />
      <Progress.Track>
        <Progress.Indicator />
      </Progress.Track>
    </Progress.Root>
  );
});
