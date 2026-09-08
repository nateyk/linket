import {Trans} from '@ui/i18n/trans';
import {Link} from 'react-router';

type Props = {
  index: number;
};
export function FooterSectionSettings({index: _index}: Props) {
  void _index;
  return (
    <div className="text-sm">
      <Trans
        message="Configure footer content from <a>Menu manager</a>."
        values={{
          a: text => (
            <Link
              className="text-primary underline"
              to="/admin/settings/menus"
              target="_blank"
            >
              {text}
            </Link>
          ),
        }}
      />
    </div>
  );
}
