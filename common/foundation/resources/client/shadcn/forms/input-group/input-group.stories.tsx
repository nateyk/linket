import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Field} from '@shadcn/forms/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from '@shadcn/forms/input-group/input-group';
import {Kbd} from '@shadcn/kbd';
import {Spinner} from '@shadcn/spinner/spinner';
import preview from '@storybook/preview';
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  CornerDownLeftIcon,
  CreditCardIcon,
  EyeOffIcon,
  FileCodeIcon,
  InfoIcon,
  LoaderIcon,
  MailIcon,
  MoreHorizontalIcon,
  RefreshCcwIcon,
  SearchIcon,
  StarIcon,
} from 'lucide-react';
import {useState} from 'react';
import TextareaAutosize from 'react-textarea-autosize';

const meta = preview.meta({
  title: 'Input Group',
  component: InputGroup,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Add addons, buttons, and helper content to inputs.',
      },
    },
  },
});

export const AlignInlineStart = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          'Use `align="inline-start"` to position the addon at the start of the input. This is the default.',
      },
    },
  },
  render: () => (
    <Field.Root className="max-w-sm">
      <Field.Label htmlFor="inline-start-input">Input</Field.Label>
      <InputGroup>
        <InputGroupInput id="inline-start-input" placeholder="Search..." />
        <InputGroupAddon align="inline-start">
          <SearchIcon className="text-muted-foreground" />
        </InputGroupAddon>
      </InputGroup>
      <Field.Description>Icon positioned at the start.</Field.Description>
    </Field.Root>
  ),
});

export const AlignInlineEnd = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          'Use `align="inline-end"` to position the addon at the end of the input.',
      },
    },
  },
  render: () => (
    <Field.Root className="max-w-sm">
      <Field.Label htmlFor="inline-end-input">Input</Field.Label>
      <InputGroup>
        <InputGroupInput
          id="inline-end-input"
          type="password"
          placeholder="Enter password"
        />
        <InputGroupAddon align="inline-end">
          <EyeOffIcon />
        </InputGroupAddon>
      </InputGroup>
      <Field.Description>Icon positioned at the end.</Field.Description>
    </Field.Root>
  ),
});

export const AlignBlockStart = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          'Use `align="block-start"` to position the addon above the input.',
      },
    },
  },
  render: () => (
    <Field.Group className="max-w-sm">
      <Field.Root>
        <Field.Label htmlFor="block-start-input">Input</Field.Label>
        <InputGroup className="h-auto">
          <InputGroupInput
            id="block-start-input"
            placeholder="Enter your name"
          />
          <InputGroupAddon align="block-start">
            <InputGroupText>Full Name</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        <Field.Description>
          Header positioned above the input.
        </Field.Description>
      </Field.Root>
      <Field.Root>
        <Field.Label htmlFor="block-start-textarea">Textarea</Field.Label>
        <InputGroup>
          <InputGroupTextarea
            id="block-start-textarea"
            placeholder="console.log('Hello, world!');"
            className="font-mono text-sm"
          />
          <InputGroupAddon align="block-start">
            <FileCodeIcon className="text-muted-foreground" />
            <InputGroupText className="font-mono">script.js</InputGroupText>
            <InputGroupButton size="icon-xs" className="ml-auto">
              <CopyIcon />
              <span className="sr-only">Copy</span>
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <Field.Description>
          Header positioned above the textarea.
        </Field.Description>
      </Field.Root>
    </Field.Group>
  ),
});

export const AlignBlockEnd = meta.story({
  parameters: {
    docs: {
      description: {
        story: 'Use `align="block-end"` to position the addon below the input.',
      },
    },
  },
  render: () => (
    <Field.Group className="max-w-sm">
      <Field.Root>
        <Field.Label htmlFor="block-end-input">Input</Field.Label>
        <InputGroup className="h-auto">
          <InputGroupInput id="block-end-input" placeholder="Enter amount" />
          <InputGroupAddon align="block-end">
            <InputGroupText>USD</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        <Field.Description>
          Footer positioned below the input.
        </Field.Description>
      </Field.Root>
      <Field.Root>
        <Field.Label htmlFor="block-end-textarea">Textarea</Field.Label>
        <InputGroup>
          <InputGroupTextarea
            id="block-end-textarea"
            placeholder="Write a comment..."
          />
          <InputGroupAddon align="block-end">
            <InputGroupText>0/280</InputGroupText>
            <InputGroupButton variant="default" size="sm" className="ml-auto">
              Post
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <Field.Description>
          Footer positioned below the textarea.
        </Field.Description>
      </Field.Root>
    </Field.Group>
  ),
});

export const Icon = meta.story({
  parameters: {
    docs: {
      description: {
        story: 'Input groups with icon addons at start/end positions.',
      },
    },
  },
  render: () => (
    <div className="grid w-full max-w-sm gap-6">
      <InputGroup>
        <InputGroupInput placeholder="Search..." />
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput type="email" placeholder="Enter your email" />
        <InputGroupAddon>
          <MailIcon />
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="Card number" />
        <InputGroupAddon>
          <CreditCardIcon />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <CheckIcon />
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="Card number" />
        <InputGroupAddon align="inline-end">
          <StarIcon />
          <InfoIcon />
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
});

export const Text = meta.story({
  parameters: {
    docs: {
      description: {
        story: 'Input groups with text addons for prefixes and suffixes.',
      },
    },
  },
  render: () => (
    <div className="grid w-full max-w-sm gap-6">
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>$</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput placeholder="0.00" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>USD</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput placeholder="example.com" className="pl-0.5!" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>.com</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="Enter your username" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>@company.com</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupTextarea placeholder="Enter your message" />
        <InputGroupAddon align="block-end">
          <InputGroupText className="text-xs text-muted-foreground">
            120 characters left
          </InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
});

export const Button = meta.story({
  parameters: {
    docs: {
      description: {
        story: 'Input groups with interactive button actions.',
      },
    },
  },
  render: function Render() {
    const [isCopied, setIsCopied] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);

    return (
      <div className="grid w-full max-w-sm gap-6">
        <InputGroup>
          <InputGroupInput placeholder="https://x.com/shadcn" readOnly />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-label="Copy"
              title="Copy"
              size="icon-xs"
              onClick={async () => {
                await navigator.clipboard.writeText('https://x.com/shadcn');
                setIsCopied(true);
                window.setTimeout(() => setIsCopied(false), 1500);
              }}
            >
              {isCopied ? <CheckIcon /> : <CopyIcon />}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <InputGroup className="[--radius:9999px]">
          <InputGroupAddon>
            <InputGroupButton size="icon-xs">
              <InfoIcon />
            </InputGroupButton>
          </InputGroupAddon>
          <InputGroupAddon className="pl-1.5 text-muted-foreground">
            https://
          </InputGroupAddon>
          <InputGroupInput id="input-secure-19" />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              onClick={() => setIsFavorite(!isFavorite)}
              size="icon-xs"
            >
              <StarIcon
                data-favorite={isFavorite}
                className="data-[favorite=true]:fill-blue-600 data-[favorite=true]:stroke-blue-600"
              />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <InputGroup>
          <InputGroupInput placeholder="Type to search..." />
          <InputGroupAddon align="inline-end">
            <InputGroupButton variant="ghost">Search</InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    );
  },
});

export const KbdStory = meta.story({
  parameters: {
    docs: {
      description: {
        story: 'If needed, install with `npm dlx shadcn@latest add kbd`.',
      },
    },
  },
  render: () => (
    <InputGroup className="max-w-sm">
      <InputGroupInput placeholder="Search..." />
      <InputGroupAddon>
        <SearchIcon className="text-muted-foreground" />
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">
        <Kbd data-slot="kbd">⌘K</Kbd>
      </InputGroupAddon>
    </InputGroup>
  ),
});

export const DropdownExample = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          'If needed, install with `npm dlx shadcn@latest add dropdown-menu`.',
      },
    },
  },
  render: () => (
    <div className="grid w-full max-w-sm gap-4">
      <InputGroup>
        <InputGroupInput placeholder="Enter file name" />
        <InputGroupAddon align="inline-end">
          <Dropdown.Root>
            <Dropdown.Trigger
              render={
                <InputGroupButton
                  variant="ghost"
                  aria-label="More"
                  size="icon-xs"
                >
                  <MoreHorizontalIcon />
                </InputGroupButton>
              }
            />
            <Dropdown.Content align="end">
              <Dropdown.Group>
                <Dropdown.Item>Settings</Dropdown.Item>
                <Dropdown.Item>Copy path</Dropdown.Item>
                <Dropdown.Item>Open location</Dropdown.Item>
              </Dropdown.Group>
            </Dropdown.Content>
          </Dropdown.Root>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup className="[--radius:1rem]">
        <InputGroupInput placeholder="Enter search query" />
        <InputGroupAddon align="inline-end">
          <Dropdown.Root>
            <Dropdown.Trigger
              render={
                <InputGroupButton variant="ghost" className="pr-1.5! text-xs">
                  Search In... <ChevronDownIcon className="size-3" />
                </InputGroupButton>
              }
            />
            <Dropdown.Content align="end">
              <Dropdown.Group>
                <Dropdown.Item>Documentation</Dropdown.Item>
                <Dropdown.Item>Blog Posts</Dropdown.Item>
                <Dropdown.Item>Changelog</Dropdown.Item>
              </Dropdown.Group>
            </Dropdown.Content>
          </Dropdown.Root>
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
});

export const SpinnerExample = meta.story({
  name: 'Spinner',
  parameters: {
    docs: {
      description: {
        story: 'If needed, install with `npm dlx shadcn@latest add spinner`.',
      },
    },
  },
  render: () => (
    <div className="grid w-full max-w-sm gap-4">
      <InputGroup>
        <InputGroupInput placeholder="Searching..." />
        <InputGroupAddon align="inline-end">
          <Spinner />
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="Processing..." />
        <InputGroupAddon>
          <Spinner />
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="Saving changes..." />
        <InputGroupAddon align="inline-end">
          <InputGroupText>Saving...</InputGroupText>
          <Spinner />
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="Refreshing data..." />
        <InputGroupAddon>
          <LoaderIcon className="animate-spin" />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <InputGroupText className="text-muted-foreground">
            Please wait...
          </InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
});

export const Textarea = meta.story({
  parameters: {
    docs: {
      description: {
        story: 'Textarea with block-start and block-end addon toolbars.',
      },
    },
  },
  render: () => (
    <div className="grid w-full max-w-md gap-4">
      <InputGroup>
        <InputGroupTextarea
          id="textarea-code-32"
          placeholder="console.log('Hello, world!');"
          className="min-h-[200px]"
        />
        <InputGroupAddon align="block-end" className="border-t">
          <InputGroupText>Line 1, Column 1</InputGroupText>
          <InputGroupButton size="sm" className="ml-auto" variant="default">
            Run <CornerDownLeftIcon />
          </InputGroupButton>
        </InputGroupAddon>
        <InputGroupAddon align="block-start" className="border-b">
          <InputGroupText className="font-mono font-medium">
            <FileCodeIcon />
            script.js
          </InputGroupText>
          <InputGroupButton className="ml-auto" size="icon-xs">
            <RefreshCcwIcon />
          </InputGroupButton>
          <InputGroupButton variant="ghost" size="icon-xs">
            <CopyIcon />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
});

export const CustomInput = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          'Add the `data-slot="input-group-control"` attribute to your custom input for automatic focus state handling.',
      },
    },
  },
  render: () => (
    <div className="grid w-full max-w-sm gap-6">
      <InputGroup>
        <TextareaAutosize
          data-slot="input-group-control"
          className="flex field-sizing-content min-h-16 w-full resize-none rounded-md bg-transparent px-3 py-2.5 text-base transition-[color,box-shadow] outline-none md:text-sm"
          placeholder="Autoresize textarea..."
        />
        <InputGroupAddon align="block-end">
          <InputGroupButton className="ml-auto" size="sm" variant="default">
            Submit
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
});

export const Rtl = meta.story({
  render: () => (
    <div className="grid w-full max-w-sm gap-6" dir="rtl">
      <InputGroup className="max-w-xs">
        <InputGroupInput placeholder="بحث..." />
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">١٢ نتيجة</InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="جاري البحث..." />
        <InputGroupAddon align="inline-end">
          <Spinner />
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="جاري حفظ التغييرات..." />
        <InputGroupAddon align="inline-end">
          <InputGroupText>جاري الحفظ...</InputGroupText>
          <Spinner />
        </InputGroupAddon>
      </InputGroup>
      <Field.Group className="max-w-sm">
        <Field.Root>
          <Field.Label htmlFor="rtl-textarea">منطقة النص</Field.Label>
          <InputGroup>
            <InputGroupTextarea
              id="rtl-textarea"
              placeholder="اكتب تعليقًا..."
            />
            <InputGroupAddon align="block-end">
              <InputGroupText>٠/٢٨٠</InputGroupText>
              <InputGroupButton variant="default" size="sm" className="ml-auto">
                نشر
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <Field.Description>تذييل موضع أسفل منطقة النص.</Field.Description>
        </Field.Root>
      </Field.Group>
    </div>
  ),
});
