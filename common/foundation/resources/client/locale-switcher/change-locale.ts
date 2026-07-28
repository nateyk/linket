import {updateUserLocale} from '@app/gen/localizations';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {useMutation} from '@tanstack/react-query';
import {
  getBootstrapData,
  mergeBootstrapData,
} from '@ui/bootstrap-data/bootstrap-data-store';
import {FirstParam} from '@ui/utils/ts/extract-params';

export function useChangeLocale() {
  return useMutation({
    mutationFn: (payload: FirstParam<typeof updateUserLocale>) =>
      updateUserLocale(payload),
    onSuccess: response => {
      const mergedLocales = getBootstrapData().i18n.locales.map(locale => {
        if (locale.language === response.data.language) {
          return {
            ...locale,
            lines: response.data.lines ?? {},
          };
        }
        return locale;
      });
      mergeBootstrapData({
        i18n: {
          locales: mergedLocales,
          active: response.data.language,
          direction: response.data.direction,
        },
      });

      document.documentElement.dir = response.data.direction;
      document.documentElement.lang = response.data.language;
    },
    onError: err => showHttpErrorToast(err),
  });
}
