import {message} from '@ui/i18n/message';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';

export const ColorPresets: {
  color: string;
  name: MessageDescriptor;
  foreground?: string;
}[] = [
  {
    color: '#ffffff',
    name: message('White'),
  },
  {
    color: '#eff5f5',
    name: message('Solitude'),
  },
  {
    color: '#f5d5ae',
    name: message('Wheat'),
  },
  {
    color: '#fde3a7',
    name: message('Cape Honey'),
  },
  {
    color: '#f2deba',
    name: message('Milk punch'),
  },
  {
    color: '#61764b',
    name: message('Dingy'),
    foreground: '#ffffff',
  },
  {
    color: '#049372',
    name: message('Aquamarine'),
    foreground: '#ffffff',
  },
  {
    color: '#def5e5',
    name: message('Cosmic Latte'),
  },
  {
    color: '#e97777',
    name: message('Geraldine'),
    foreground: '#5a0e0e',
  },
  {
    color: '#f7a4a4',
    name: message('Sundown'),
  },
  {
    color: '#1e8bc3',
    name: message('Pelorous'),
    foreground: '#ffffff',
  },
  {
    color: '#8e44ad',
    name: message('Deep Lilac'),
    foreground: '#ffffff',
  },
  {
    color: '#6c4ab6',
    name: message('Blue marguerite'),
    foreground: '#ffffff',
  },
  {
    color: '#8b7e74',
    name: message('Americano'),
    foreground: '#ffffff',
  },
  {
    color: '#000000',
    name: message('Black'),
    foreground: '#ffffff',
  },
  {
    color: '#404258',
    name: message('Blue zodiac'),
    foreground: '#ffffff',
  },
  {
    color: '#65647c',
    name: message('Comet'),
    foreground: '#ffffff',
  },
];
