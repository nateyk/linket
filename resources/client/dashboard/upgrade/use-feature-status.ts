import {useUsage} from '@app/dashboard/use-usage';
import {GetUsage200DataLinks} from '@app/gen/schemas/get-usage200-data-links';
import {GetUsage200DataQrCodes} from '@app/gen/schemas/get-usage200-data-qr-codes';

export function useLinkFeatureStatus(
  feature: keyof Pick<
    GetUsage200DataLinks,
    'back_half' | 'password' | 'expiration' | 'utm' | 'retargeting'
  >,
): {disabled: boolean} {
  const {data} = useUsage();
  return {disabled: data ? !data.data.links[feature] : false};
}

export function useQrCodeFeatureStatus(
  feature: keyof Pick<GetUsage200DataQrCodes, 'style'>,
) {
  const {data} = useUsage();
  return {disabled: data ? !data.data.qr_codes[feature] : false};
}
