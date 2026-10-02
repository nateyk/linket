import {
  SiApplemusic,
  SiBandcamp,
  SiFacebook,
  SiInstagram,
  SiPatreon,
  SiPinterest,
  SiSnapchat,
  SiSoundcloud,
  SiSpotify,
  SiTelegram,
  SiTiktok,
  SiTwitch,
  SiWhatsapp,
  SiX,
  SiYoutube,
} from '@icons-pack/react-simple-icons';
import {message} from '@ui/i18n/message';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {AmazonIcon} from '@ui/icons/social/amazon';
import {LinkedinIcon} from '@ui/icons/social/linkedin';
import {AtSignIcon} from 'lucide-react';
import {ReactElement} from 'react';

export interface SocialsListItem {
  name: MessageDescriptor;
  placeholder: string;
  icon: ReactElement;
  inputType?: string;
  pattern?: string;
}

export enum SocialsType {
  Mail = 'mail',
  Facebook = 'facebook',
  Twitter = 'twitter',
  Instagram = 'instagram',
  Tiktok = 'tiktok',
  Youtube = 'youtube',
  Soundcloud = 'soundcloud',
  Bandcamp = 'bandcamp',
  LinkedIn = 'linkedin',
  Whatsapp = 'whatsapp',
  Telegram = 'telegram',
  Twitch = 'twitch',
  Patreon = 'patreon',
  Pinterest = 'pinterest',
  Spotify = 'spotify',
  Amazon = 'amazon',
  Snapchat = 'snapchat',
  Apple = 'apple',
}

export const SocialsList: Record<SocialsType, SocialsListItem> = {
  [SocialsType.Mail]: {
    name: message('Email'),
    placeholder: 'your@email.com',
    inputType: 'email',
    icon: <AtSignIcon />,
  },
  [SocialsType.Facebook]: {
    name: message('Facebook url'),
    placeholder: 'https://facebook.com/username',
    pattern: 'https://(www.)?facebook.com/[a-zA-Z0-9._%-]+$',
    inputType: 'url',
    icon: <SiFacebook />,
  },
  [SocialsType.Twitter]: {
    name: message('X (twitter) handle'),
    placeholder: '@yourxhandle',
    pattern: '^@[A-Za-z0-9_]{1,15}$',
    icon: <SiX />,
  },
  [SocialsType.Instagram]: {
    name: message('Instagram username'),
    placeholder: '@instagramusername',
    pattern: '^@[a-zA-Z0-9._%-]+$',
    icon: <SiInstagram />,
  },
  [SocialsType.Tiktok]: {
    name: message('TikTok username'),
    placeholder: '@tiktokusername',
    pattern: '^@[a-zA-Z0-9._%-]+$',
    icon: <SiTiktok />,
  },
  [SocialsType.Youtube]: {
    name: message('Youtube channel url'),
    placeholder: 'https://youtube.com/channel/youtubechannelurl',
    inputType: 'url',
    pattern: 'https://(www.)?youtube.com/channel/[a-zA-Z0-9._%-]+$',
    icon: <SiYoutube />,
  },
  [SocialsType.Soundcloud]: {
    name: message('SoundCloud url'),
    placeholder: 'https://soundcloud.com/username',
    inputType: 'url',
    pattern: 'https://(www.)?soundcloud.com/[a-zA-Z0-9._%-]+$',
    icon: <SiSoundcloud />,
  },
  [SocialsType.Bandcamp]: {
    name: message('Bandcamp url'),
    placeholder: 'https://you.bandcamp.com',
    inputType: 'url',
    pattern: 'https://(www.)?[a-zA-Z0-9._%-]+.bandcamp.com$',
    icon: <SiBandcamp />,
  },
  [SocialsType.LinkedIn]: {
    name: message('LinkedIn'),
    placeholder: 'https://linkedin.com/in/username',
    inputType: 'url',
    pattern: 'https://(www.)?linkedin.com/[a-zA-Z0-9._%-]+/[a-zA-Z0-9._%-]+$',
    icon: <LinkedinIcon />,
  },
  [SocialsType.Whatsapp]: {
    name: message('WhatsApp'),
    placeholder: '+00000000000',
    pattern: '^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\\s\\./0-9]*$',
    icon: <SiWhatsapp />,
  },
  [SocialsType.Telegram]: {
    name: message('Telegram url'),
    placeholder: 'https://t.me',
    inputType: 'url',
    pattern: 'https://(www.)?t.me/[a-zA-Z0-9._%-]+$',
    icon: <SiTelegram />,
  },
  [SocialsType.Twitch]: {
    name: message('Twitch url'),
    placeholder: 'https://twitch.tv/username',
    inputType: 'url',
    pattern: 'https://(www.)?twitch.tv/[a-zA-Z0-9._%-]+$',
    icon: <SiTwitch />,
  },
  [SocialsType.Patreon]: {
    name: message('Patreon url'),
    placeholder: 'https://patreon.com/username',
    inputType: 'url',
    pattern: 'https://(www.)?patreon.com/[a-zA-Z0-9._%-]+$',
    icon: <SiPatreon />,
  },
  [SocialsType.Pinterest]: {
    name: message('Pinterest url'),
    placeholder: 'https://pinterest.com',
    inputType: 'url',
    pattern: 'https://(www.)?pinterest.com/.+',
    icon: <SiPinterest />,
  },
  [SocialsType.Spotify]: {
    name: message('Spotify artist url'),
    placeholder: 'https://open.spotify.com/artist/artistname',
    inputType: 'url',
    pattern: 'https://(www.)?open.spotify.com/artist/[a-zA-Z0-9._%-]+$',
    icon: <SiSpotify />,
  },
  [SocialsType.Amazon]: {
    name: message('Amazon shop url'),
    placeholder: 'https://amazon.com/shop/yourshopname',
    inputType: 'url',
    pattern: 'https://(www.)?amazon.com/shop/[a-zA-Z0-9._%-]+$',
    icon: <AmazonIcon />,
  },
  [SocialsType.Snapchat]: {
    name: message('Snapchat url'),
    placeholder: 'https://www.snapchat.com/add/yourusername',
    inputType: 'url',
    pattern: 'https://(www.)?snapchat.com/add/[a-zA-Z0-9_--%]+$',
    icon: <SiSnapchat />,
  },
  [SocialsType.Apple]: {
    name: message('Apple music url'),
    placeholder: 'https://music.apple.com/us/album/youralbum',
    inputType: 'url',
    pattern: 'https://(www.)?music.apple.com/.+',
    icon: <SiApplemusic />,
  },
};
