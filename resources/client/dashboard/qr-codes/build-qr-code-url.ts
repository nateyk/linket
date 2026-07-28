import {QrCode} from '@app/gen/schemas/qr-code';
import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';

type BuildQrCodeUrlParams = Pick<QrCode, 'back_half'>;

export function buildQrCodeUrl(qrCode: BuildQrCodeUrlParams): string {
  const {base_url} = getBootstrapData().settings;
  return `${base_url}/qr/${qrCode.back_half}`;
}
