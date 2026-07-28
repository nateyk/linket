import preview from '@storybook/preview';
import {Trans} from '@ui/i18n/trans';

import {Autocomplete} from '@shadcn/autocomplete/autocomplete';
import {Button} from '@shadcn/button/button';
import {InputGroupAddon} from '@shadcn/forms/input-group/input-group';
import {Input} from '@shadcn/forms/input/input';
import {Item} from '@shadcn/item/item';
import {PlayIcon, SearchIcon} from 'lucide-react';
import {useRef, useState} from 'react';

type FrameworkOption = {
  id: string;
  label: string;
  value: string;
};

const frameworkOptions: FrameworkOption[] = [
  {id: 'react', label: 'React', value: 'react'},
  {id: 'vue', label: 'Vue', value: 'vue'},
  {id: 'angular', label: 'Angular', value: 'angular'},
  {id: 'svelte', label: 'Svelte', value: 'svelte'},
  {id: 'solid', label: 'Solid', value: 'solid'},
];

const meta = preview.meta({
  title: 'Autocomplete',
  component: Autocomplete.Root,
  subcomponents: {
    AutocompleteInput: Autocomplete.Input,
    AutocompleteContent: Autocomplete.Content,
    AutocompleteEmpty: Autocomplete.Empty,
    AutocompleteList: Autocomplete.List,
    AutocompleteItem: Autocomplete.Item,
    AutocompleteGroup: Autocomplete.Group,
    AutocompleteGroupLabel: Autocomplete.GroupLabel,
  },
});

export const Basic = meta.story({
  render: () => (
    <div className="w-80">
      <Autocomplete.Root items={frameworkOptions}>
        <Autocomplete.Input
          placeholder="Search framework..."
          aria-label="Framework"
        ></Autocomplete.Input>
        <Autocomplete.Content>
          <Autocomplete.Empty>
            <Trans message="No framework found." />
          </Autocomplete.Empty>
          <Autocomplete.List>
            {item => (
              <Autocomplete.Item key={item.id} value={item.value}>
                {item.label}
              </Autocomplete.Item>
            )}
          </Autocomplete.List>
        </Autocomplete.Content>
      </Autocomplete.Root>
    </div>
  ),
});

const searchResults = [
  {
    label: <Trans message="Tracks" />,
    value: 'tracks',
    items: [
      {
        id: 1,
        name: 'Bohemian Rhapsody',
        artist: 'Queen',
        image:
          'https://i.scdn.co/image/ab6772690000bac347488c35a509d42072c23976',
      },
      {
        id: 2,
        name: "Don't Stop Me Now",
        artist: 'Queen',
        image:
          'https://i.scdn.co/image/ab67616d00001e027c39dd133836c2c1c87e34d6',
      },
      {
        id: 3,
        name: 'We Will Rock You',
        artist: 'Queen',
        image:
          'https://i.scdn.co/image/ab67616d00001e021f7077ae1018b5fbab08dfa8',
      },
    ],
  },
];

export const SearchAutocomplete = meta.story(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  return (
    <div className="w-lg">
      <Autocomplete.Root
        items={searchResults}
        autoHighlight
        open={isOpen}
        onOpenChange={setIsOpen}
        value={inputValue}
        onValueChange={setInputValue}
      >
        <Autocomplete.Input
          className="h-12 w-full rounded-full *:data-[slot=input-group-control]:md:text-base"
          placeholder="Search for artists, albums and songs..."
        >
          <InputGroupAddon>
            <SearchIcon className="size-5" />
          </InputGroupAddon>
        </Autocomplete.Input>
        <Autocomplete.Content>
          <Autocomplete.Empty>
            <Trans message="No results found." />
          </Autocomplete.Empty>
          <Autocomplete.List>
            {group => (
              <Autocomplete.Group key={group.value} items={group.items}>
                <Autocomplete.GroupLabel>{group.label}</Autocomplete.GroupLabel>
                <Autocomplete.Collection>
                  {item => (
                    <Autocomplete.Item
                      key={item.id}
                      value={item.id}
                      onClick={e => {
                        e.preventBaseUIHandler();
                        setInputValue('');
                        setIsOpen(false);
                      }}
                    >
                      <Item>
                        <Item.Media
                          variant="image"
                          className="group relative size-12"
                        >
                          <img src={item.image} />
                          <div className="absolute inset-0 hidden items-center justify-center bg-black/50 group-hover:flex">
                            <Button
                              variant="ghost"
                              color="default"
                              size="icon"
                              onClick={e => {
                                e.stopPropagation();
                                e.preventBaseUIHandler();
                              }}
                            >
                              <PlayIcon className="size-4" />
                            </Button>
                          </div>
                        </Item.Media>
                        <Item.Content className="gap-0.5">
                          <Item.Title className="font-normal">
                            {item.name}
                          </Item.Title>
                          <Item.Description className="text-xs">
                            {item.artist}
                          </Item.Description>
                        </Item.Content>
                      </Item>
                    </Autocomplete.Item>
                  )}
                </Autocomplete.Collection>
              </Autocomplete.Group>
            )}
          </Autocomplete.List>
        </Autocomplete.Content>
      </Autocomplete.Root>
    </div>
  );
});

export const EmojiPicker = meta.story(() => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [textValue, setTextValue] = useState('');
  const [searchValue, setSearchValue] = useState('');

  const textInputRef = useRef<HTMLInputElement | null>(null);

  function handleInsertEmoji(value: string) {
    setTextValue(value);
    setPickerOpen(false);
    textInputRef.current?.focus();
  }

  return (
    <div className="w-md">
      <div className="flex items-center gap-2">
        <Input
          ref={textInputRef}
          placeholder="iMessage"
          value={textValue}
          onChange={event => setTextValue(event.target.value)}
        />

        <Autocomplete.Root
          items={emojiGroups}
          grid
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onOpenChangeComplete={() => setSearchValue('')}
          value={searchValue}
          onValueChange={(value, details) => {
            if (details.reason !== 'item-press') {
              setSearchValue(value);
            }
          }}
        >
          <Autocomplete.Trigger
            aria-label="Choose emoji"
            render={<Button variant="outline" color="default" size="icon" />}
          >
            😀
          </Autocomplete.Trigger>
          <Autocomplete.Content className="w-64">
            <Autocomplete.Input
              placeholder="Search emojis…"
              showClear={false}
            />
            <Autocomplete.Empty>No emojis found</Autocomplete.Empty>
            <Autocomplete.List>
              {(group: EmojiGroup) => (
                <Autocomplete.Group key={group.value} items={group.items}>
                  <Autocomplete.GroupLabel>
                    {group.label}
                  </Autocomplete.GroupLabel>
                  {chunkArray(group.items, COLUMNS).map((row, rowIdx) => (
                    <Autocomplete.Row key={rowIdx} className="grid grid-cols-6">
                      {row.map(rowItem => (
                        <Autocomplete.Item
                          key={rowItem.emoji}
                          value={rowItem}
                          onClick={() => {
                            handleInsertEmoji(rowItem.emoji);
                          }}
                          className="flex aspect-square w-full items-center justify-center p-0"
                        >
                          {rowItem.emoji}
                        </Autocomplete.Item>
                      ))}
                    </Autocomplete.Row>
                  ))}
                </Autocomplete.Group>
              )}
            </Autocomplete.List>
          </Autocomplete.Content>
        </Autocomplete.Root>
      </div>
    </div>
  );
});

const COLUMNS = 6;

function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

interface EmojiItem {
  emoji: string;
  value: string;
  name: string;
}

interface EmojiGroup {
  value: string;
  label: string;
  items: EmojiItem[];
}

const emojiCategories = [
  {
    label: 'Smileys & Emotion',
    emojis: [
      {emoji: '😀', name: 'grinning face'},
      {emoji: '😃', name: 'grinning face with big eyes'},
      {emoji: '😄', name: 'grinning face with smiling eyes'},
      {emoji: '😁', name: 'beaming face with smiling eyes'},
      {emoji: '😆', name: 'grinning squinting face'},
      {emoji: '😅', name: 'grinning face with sweat'},
      {emoji: '🤣', name: 'rolling on the floor laughing'},
      {emoji: '😂', name: 'face with tears of joy'},
      {emoji: '🙂', name: 'slightly smiling face'},
      {emoji: '🙃', name: 'upside-down face'},
      {emoji: '😉', name: 'winking face'},
      {emoji: '😊', name: 'smiling face with smiling eyes'},
      {emoji: '😇', name: 'smiling face with halo'},
      {emoji: '🥰', name: 'smiling face with hearts'},
      {emoji: '😍', name: 'smiling face with heart-eyes'},
      {emoji: '🤩', name: 'star-struck'},
      {emoji: '😘', name: 'face blowing a kiss'},
      {emoji: '😗', name: 'kissing face'},
      {emoji: '☺️', name: 'smiling face'},
      {emoji: '😚', name: 'kissing face with closed eyes'},
      {emoji: '😙', name: 'kissing face with smiling eyes'},
      {emoji: '🥲', name: 'smiling face with tear'},
      {emoji: '😋', name: 'face savoring food'},
      {emoji: '😛', name: 'face with tongue'},
      {emoji: '😜', name: 'winking face with tongue'},
      {emoji: '🤪', name: 'zany face'},
      {emoji: '😝', name: 'squinting face with tongue'},
      {emoji: '🤑', name: 'money-mouth face'},
      {emoji: '🤗', name: 'hugging face'},
      {emoji: '🤭', name: 'face with hand over mouth'},
    ],
  },
  {
    label: 'Animals & Nature',
    emojis: [
      {emoji: '🐶', name: 'dog face'},
      {emoji: '🐱', name: 'cat face'},
      {emoji: '🐭', name: 'mouse face'},
      {emoji: '🐹', name: 'hamster'},
      {emoji: '🐰', name: 'rabbit face'},
      {emoji: '🦊', name: 'fox'},
      {emoji: '🐻', name: 'bear'},
      {emoji: '🐼', name: 'panda'},
      {emoji: '🐨', name: 'koala'},
      {emoji: '🐯', name: 'tiger face'},
      {emoji: '🦁', name: 'lion'},
      {emoji: '🐮', name: 'cow face'},
      {emoji: '🐷', name: 'pig face'},
      {emoji: '🐽', name: 'pig nose'},
      {emoji: '🐸', name: 'frog'},
      {emoji: '🐵', name: 'monkey face'},
      {emoji: '🙈', name: 'see-no-evil monkey'},
      {emoji: '🙉', name: 'hear-no-evil monkey'},
      {emoji: '🙊', name: 'speak-no-evil monkey'},
      {emoji: '🐒', name: 'monkey'},
      {emoji: '🐔', name: 'chicken'},
      {emoji: '🐧', name: 'penguin'},
      {emoji: '🐦', name: 'bird'},
      {emoji: '🐤', name: 'baby chick'},
      {emoji: '🐣', name: 'hatching chick'},
      {emoji: '🐥', name: 'front-facing baby chick'},
      {emoji: '🦆', name: 'duck'},
      {emoji: '🦅', name: 'eagle'},
      {emoji: '🦉', name: 'owl'},
      {emoji: '🦇', name: 'bat'},
    ],
  },
  {
    label: 'Food & Drink',
    emojis: [
      {emoji: '🍎', name: 'red apple'},
      {emoji: '🍏', name: 'green apple'},
      {emoji: '🍊', name: 'tangerine'},
      {emoji: '🍋', name: 'lemon'},
      {emoji: '🍌', name: 'banana'},
      {emoji: '🍉', name: 'watermelon'},
      {emoji: '🍇', name: 'grapes'},
      {emoji: '🍓', name: 'strawberry'},
      {emoji: '🫐', name: 'blueberries'},
      {emoji: '🍈', name: 'melon'},
      {emoji: '🍒', name: 'cherries'},
      {emoji: '🍑', name: 'peach'},
      {emoji: '🥭', name: 'mango'},
      {emoji: '🍍', name: 'pineapple'},
      {emoji: '🥥', name: 'coconut'},
      {emoji: '🥝', name: 'kiwi fruit'},
      {emoji: '🍅', name: 'tomato'},
      {emoji: '🍆', name: 'eggplant'},
      {emoji: '🥑', name: 'avocado'},
      {emoji: '🥦', name: 'broccoli'},
      {emoji: '🥬', name: 'leafy greens'},
      {emoji: '🥒', name: 'cucumber'},
      {emoji: '🌶️', name: 'hot pepper'},
      {emoji: '🫑', name: 'bell pepper'},
      {emoji: '🌽', name: 'ear of corn'},
      {emoji: '🥕', name: 'carrot'},
      {emoji: '🫒', name: 'olive'},
      {emoji: '🧄', name: 'garlic'},
      {emoji: '🧅', name: 'onion'},
      {emoji: '🥔', name: 'potato'},
    ],
  },
];

const emojiGroups: EmojiGroup[] = emojiCategories.map(category => ({
  value: category.label,
  label: category.label,
  items: category.emojis.map(emoji => ({
    ...emoji,
    value: emoji.name.toLowerCase(),
  })),
}));
