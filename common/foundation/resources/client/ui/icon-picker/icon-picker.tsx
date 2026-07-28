import {IconGridButton} from '@common/ui/icon-picker/icon-grid-button';
import {Input} from '@shadcn/forms/input/input';
import {useTrans} from '@ui/i18n/use-trans';
import {IconTree} from '@ui/icons/create-svg-icon';
import {Skeleton} from '@ui/skeleton/skeleton';
import {AnimatePresence} from 'framer-motion';
import React, {Suspense, useState} from 'react';

const skeletons = [...Array(72).keys()];

const IconList = React.lazy(() => import('./icon-list'));

interface IconListProps {
  onIconSelected: (icon: IconTree[] | null) => void;
}
export default function IconPicker({onIconSelected}: IconListProps) {
  const {trans} = useTrans();
  const [value, setValue] = useState('');

  return (
    <div className="py-1">
      <Input
        bindToHookForm={false}
        className="mb-5"
        value={value}
        onChange={e => {
          setValue(e.target.value);
        }}
        placeholder={trans({message: 'Search icons...'})}
      />
      <AnimatePresence mode="wait">
        <Suspense
          fallback={
            <div className="grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] gap-2.5">
              {skeletons.map((_, index) => (
                <IconGridButton key={index} disabled>
                  <Skeleton variant="rect" />
                </IconGridButton>
              ))}
            </div>
          }
        >
          <IconList searchQuery={value} onIconSelected={onIconSelected} />
        </Suspense>
      </AnimatePresence>
    </div>
  );
}
