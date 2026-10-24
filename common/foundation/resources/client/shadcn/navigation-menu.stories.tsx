import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@shadcn/navigation-menu';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect} from 'storybook/test';

const meta = {
  component: NavigationMenu,
  tags: ['ai-generated'],
} satisfies Meta<typeof NavigationMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Products</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-48 gap-2 p-2">
              <li>
                <NavigationMenuLink href="#digital">
                  Digital products
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink href="#courses">Courses</NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#pricing">Pricing</NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
  play: async ({canvas}) => {
    const trigger = canvas.getByRole('button', {name: /products/i});
    await expect(trigger).toHaveTextContent(/products/i);
    // Content is CSS hover/focus-within revealed; Pricing link is always in tree.
    await expect(canvas.getByRole('link', {name: /pricing/i})).toHaveAttribute(
      'href',
      '#pricing',
    );
  },
};

export const LinksOnly: Story = {
  render: () => (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink href="#docs">Docs</NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#blog">Blog</NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
};
