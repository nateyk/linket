import {SiteConfigContextValue} from '@common/core/settings/site-config-context';
import {CommonUploadType} from '@common/uploads/common-upload-type';
import {Trans} from '@ui/i18n/trans';

const folder = 'images/verts';

export const SiteConfig: Partial<SiteConfigContextValue> = {
  demo: {
    email: 'user@user.com',
    password: 'password',
  },
  roles: {
    types: [
      {type: 'users', label: <Trans message="Users" />},
      {type: 'workspace', label: <Trans message="Workspace" />},
    ],
  },
  admin: {
    ads: [
      {
        slot: 'ads.biolink_top',
        description: (
          <Trans message="This ad will appear at the top of biolink pages." />
        ),
        image: `${folder}/biolink-top.webp`,
      },
      {
        slot: 'ads.splash_top',
        description: (
          <Trans message="This ad will appear at the top of link splash pages." />
        ),
        image: `${folder}/splash-top.webp`,
      },
      {
        slot: 'ads.splash_bottom',
        description: (
          <Trans message="This ad will appear at the bottom of link splash pages." />
        ),
        image: `${folder}/splash-bottom.webp`,
      },
      {
        slot: 'ads.dashboard',
        description: (
          <Trans message="This ad will appear on user dashboard page." />
        ),
        image: `${folder}/dashboard-top.webp`,
      },
      {
        slot: 'ads.frame',
        description: (
          <Trans message="This ad will appear on link frame page." />
        ),
        image: `${folder}/frame-top.webp`,
      },
      {
        slot: 'ads.landing',
        description: (
          <Trans message="This ad will appear at the top of landing page." />
        ),
        image: `${folder}/landing-top.webp`,
      },
      {
        slot: 'ads.link_page',
        description: (
          <Trans message="This ad will appear on custom link pages." />
        ),
        image: `${folder}/page-top.webp`,
      },
    ],
  },
};

export const UploadType = {
  ...CommonUploadType,
  linkImages: 'linkImages',
  digitalProductFiles: 'digitalProductFiles',
  courseVideos: 'courseVideos',
  courseResources: 'courseResources',
} as const;
