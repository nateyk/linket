import awash from '@app/account-settings/bank-logos/awash.svg';
import boa from '@app/account-settings/bank-logos/boa.svg';
import cbe from '@app/account-settings/bank-logos/cbe.svg';
import cbebirr from '@app/account-settings/bank-logos/cbebirr.svg';
import dashen from '@app/account-settings/bank-logos/dashen.svg';
import telebirr from '@app/account-settings/bank-logos/telebirr.svg';
import {LandmarkIcon} from 'lucide-react';

const logos: Record<string, string> = {awash, boa, cbe, cbebirr, dashen, telebirr};

export function BankLogo({code, name, className}: {code: string; name: string; className?: string}) {
  return (
    <div className={`flex size-10 shrink-0 items-center justify-center rounded-card-sm border border-border bg-background p-1 ${className ?? ''}`}>
      {logos[code] ? <img src={logos[code]} alt={name} className="size-full object-contain" /> : <LandmarkIcon aria-label={name} role="img" className="size-5 text-muted-foreground" />}
    </div>
  );
}
