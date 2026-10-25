import {AiAgentSettings} from '@ai/ai-agent/settings/ai-agent-settings';
import {Accordion} from '@shadcn/accordion/accordion';
import {Button} from '@shadcn/button/button';
import {Spinner} from '@shadcn/spinner/spinner';
import {Form} from '@ui/forms/form';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {toast} from '@ui/toast/toast';
import {CheckIcon} from 'lucide-react';
import {
  createContext,
  ReactElement,
  ReactNode,
  useContext,
  useState,
} from 'react';
import {UseFormReturn} from 'react-hook-form';
import {useUpdateAiAgentSettings} from './use-update-ai-agent-settings';

const PanelCloseContext = createContext<(value: string) => void>(() => {});

export function AiAgentSettingsAccordion({children}: {children: ReactNode}) {
  const [open, setOpen] = useState<string[]>([]);

  return (
    <PanelCloseContext.Provider
      value={value => setOpen(current => current.filter(item => item !== value))}
    >
      <Accordion.Root
        multiple
        variant="separated"
        className="gap-6"
        value={open}
        onValueChange={setOpen}
      >
        {children}
      </Accordion.Root>
    </PanelCloseContext.Provider>
  );
}

interface Props {
  value: string;
  label: ReactNode;
  description: ReactNode;
  icon: ReactElement;
  children: ReactNode;
  form: UseFormReturn<Partial<AiAgentSettings>>;
}
export function PanelLayout({
  value,
  label,
  description,
  icon,
  children,
  form,
}: Props) {
  const updateSettings = useUpdateAiAgentSettings(form);
  const closePanel = useContext(PanelCloseContext);

  return (
    <Accordion.Item value={value}>
      <Accordion.Trigger>
        <span className="flex min-w-0 items-center gap-3">
          <span className="text-muted-foreground">{icon}</span>
          <span className="flex min-w-0 flex-col items-start gap-0.5">
            <span>{label}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {description}
            </span>
          </span>
        </span>
      </Accordion.Trigger>
      <Accordion.Content>
        <Form
          form={form}
          className="flex flex-col gap-4"
          onSubmit={values =>
            updateSettings.mutate(values, {
              onSuccess: () => {
                toast(message('Changes saved'));
              },
            })
          }
          onBeforeSubmit={() => form.clearErrors()}
        >
          {children}
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              <Trans message="Save" />
            </Button>
            <Button
              variant="outline"
              color="default"
              type="button"
              size="sm"
              disabled={updateSettings.isPending}
              onClick={() => {
                form.reset();
                closePanel(value);
              }}
            >
              <Trans message="Cancel" />
            </Button>
          </div>
        </Form>
      </Accordion.Content>
    </Accordion.Item>
  );
}
