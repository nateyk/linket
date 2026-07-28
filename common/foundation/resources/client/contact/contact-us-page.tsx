import {CaptchaContainer} from '@common/captcha/captcha-container';
import {Footer} from '@common/ui/footer/footer';
import {Navbar} from '@common/ui/navigation/navbar/navbar';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {toast} from '@shadcn/toast/toast';
import {Trans} from '@ui/i18n/trans';
import {useForm} from 'react-hook-form';
import {useCaptcha} from '../captcha/use-captcha';
import {StaticPageTitle} from '../seo/static-page-title';
import {
  ContactPagePayload,
  useSubmitContactForm,
} from './use-submit-contact-form';

export function Component() {
  const form = useForm<ContactPagePayload>();
  const submitForm = useSubmitContactForm(form);
  const {captchaToken, captchaEnabled, resetCaptcha} = useCaptcha('contact');

  return (
    <div className="flex min-h-screen flex-col bg-muted">
      <StaticPageTitle>
        <Trans message="Contact us" />
      </StaticPageTitle>

      <Navbar.Root className="sticky top-0 z-10 border-b bg-background">
        <Navbar.Logo />
        <Navbar.Menu position="contact-us-page" />
        <Navbar.Content className="ml-auto">
          <Navbar.AuthContent />
        </Navbar.Content>
      </Navbar.Root>

      <div className="flex w-full flex-auto items-center justify-center p-6 md:p-10">
        <Card.Root className="w-full max-w-155">
          <Card.Header>
            <Card.Title>
              <Trans message="Contact us" />
            </Card.Title>
            <Card.Description>
              <Trans message="Please use the form below to send us a message and we'll get back to you as soon as possible." />
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <HookForm.Root
              form={form}
              onSubmit={async value => {
                if (captchaEnabled && !captchaToken) {
                  toast.error(
                    <Trans message="Please solve the captcha challenge." />,
                  );
                  return;
                }
                submitForm.mutate(
                  {
                    ...value,
                    captcha_token: captchaToken,
                  },
                  {onError: () => resetCaptcha()},
                );
              }}
            >
              <Field.Group>
                <HookForm.Field name="name">
                  <Field.Label>
                    <Trans message="Name" />
                  </Field.Label>
                  <Input required />
                  <Field.Error />
                </HookForm.Field>
                <HookForm.Field name="email">
                  <Field.Label>
                    <Trans message="Email" />
                  </Field.Label>
                  <Input type="email" required />
                  <Field.Error />
                </HookForm.Field>
                <HookForm.Field name="message">
                  <Field.Label>
                    <Trans message="Message" />
                  </Field.Label>
                  <Textarea rows={8} required />
                  <Field.Error />
                </HookForm.Field>
              </Field.Group>
              {captchaEnabled && <CaptchaContainer className="mt-5" />}
              <Button
                type="submit"
                className="mt-5"
                disabled={submitForm.isPending}
              >
                <Trans message="Send message" />
              </Button>
            </HookForm.Root>
          </Card.Content>
        </Card.Root>
      </div>
      <Footer className="mx-3.5 md:mx-10" />
    </div>
  );
}
