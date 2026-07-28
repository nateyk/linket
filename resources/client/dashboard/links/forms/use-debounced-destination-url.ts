import {urlIsValid} from '@app/dashboard/links/utils/url-is-valid';
import debounce from 'just-debounce-it';
import {useEffect, useState} from 'react';
import {useFormContext} from 'react-hook-form';

export function useDebouncedDestinationUrl({
  formKey = 'long_url',
}: {
  formKey: string;
}) {
  const {subscribe} = useFormContext<{[key: string]: string}>();

  // default value should be empty, only update value after user actually types something, to prevent making form dirty on initial load.
  const [debouncedValue, setValue] = useState<string>(() => '');

  useEffect(() => {
    const setDebouncedValue = debounce(setValue, 1000);
    return subscribe({
      name: formKey,
      formState: {
        values: true,
      },
      callback: data => {
        let value = data.values[formKey] ?? '';
        if (
          data.dirtyFields?.[formKey] &&
          urlIsValid(value, {checkForDomain: true})
        ) {
          if (!value.match(/^[a-zA-Z]+:\/\//)) {
            value = `https://${value}`;
          }
          setDebouncedValue(value);
        }
      },
    });
  }, [subscribe, formKey]);

  return debouncedValue;
}
