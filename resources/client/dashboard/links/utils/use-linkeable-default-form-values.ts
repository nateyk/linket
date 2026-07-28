import {Biolink} from '@app/gen/schemas/biolink';
import {CrupdateLinkBody} from '@app/gen/schemas/crupdate-link-body';
import {Folder} from '@app/gen/schemas/folder';
import {Link} from '@app/gen/schemas/link';
import {useSettings} from '@ui/settings/use-settings';
import {nanoid} from 'nanoid';
import {useMemo} from 'react';

const defaultUtmTags = ['source', 'medium', 'campaign', 'term', 'content'];

type UseLinkDefaulFormValuesProps = {
  folder?: {
    id: number;
    name: string;
    model_type: 'folder' | 'biolink';
  } | null;
  link?: Omit<Link, 'model_type'>;
};
export function useLinkDefaultFormValues({
  folder,
  link,
}: UseLinkDefaulFormValuesProps = {}) {
  const {links} = useSettings();
  const linkeableDefaultValues = useLinkeableDefaultFormValues(link);

  return useMemo(() => {
    const initialType = links?.default_type ?? 'direct';

    return {
      ...linkeableDefaultValues,
      qr_code_style: link?.qr_code?.style ?? null,
      create_qr_code: false,
      long_url: link?.long_url ?? '',
      type: link?.type ?? initialType,
      type_id: link?.type_id ?? null,
      folder_id: link?.folder_id ?? folder?.id ?? null,
    };
  }, [link, folder, links, linkeableDefaultValues]);
}

export function useLinkeableDefaultFormValues(
  linkeable?: Biolink | Folder | Omit<Link, 'model_type'>,
) {
  const {custom_domains} = useSettings();

  return useMemo(() => {
    const initialDomainId = custom_domains?.allow_all_option ? undefined : 0;
    const rules = linkeable?.rules || [];
    const defaultUtm: CrupdateLinkBody['utm'] = {};
    const customUtm: CrupdateLinkBody['utm_custom'] = [];

    if (linkeable?.utm) {
      const queryParams = new URLSearchParams(linkeable.utm);
      for (const [key, value] of queryParams.entries()) {
        if (defaultUtmTags.includes(key)) {
          defaultUtm[key as keyof typeof defaultUtm] = value;
        } else {
          customUtm.push({key, value});
        }
      }
    }

    return {
      back_half: linkeable?.back_half ?? nanoid(5),
      activates_at: linkeable?.activates_at ?? '',
      expires_at: linkeable?.expires_at ?? '',
      name: linkeable?.name ?? '',
      description:
        linkeable && 'description' in linkeable && linkeable.description
          ? linkeable.description
          : '',
      image:
        linkeable && 'image' in linkeable && linkeable.image
          ? linkeable.image
          : '',
      password: linkeable?.password ?? null,
      rules: rules,
      utm: defaultUtm,
      utm_custom: customUtm,
      domain_id: linkeable?.domain_id ?? initialDomainId,
      pixels: linkeable?.pixels ?? [],
      tags: linkeable?.tags ?? [],
    };
  }, [linkeable, custom_domains]);
}
