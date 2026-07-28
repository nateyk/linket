import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Sidebar} from '@common/ui/dashboard/sidebar';
import {Button} from '@shadcn/button/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@shadcn/collapsible/collapsible';
import {
  Meter,
  MeterIndicator,
  MeterLabel,
  MeterTrack,
  MeterValue,
} from '@shadcn/meter/meter';
import preview from '@storybook/preview';
import {
  BrainIcon,
  ChartColumnBigIcon,
  ChevronRightIcon,
  FolderIcon,
  GlobeIcon,
  LayoutPanelTopIcon,
  LinkIcon,
  MousePointer2Icon,
  Plus,
  PlusIcon,
  QrCodeIcon,
} from 'lucide-react';
import {MemoryRouter, NavLink} from 'react-router';

const meta = preview.meta({
  title: 'Dashboard',
  component: DashboardLayout.Root,
  subcomponents: {},
  tags: ['autodocs'],
});

export const Basic = meta.story({
  render: () => (
    <MemoryRouter>
      <DashboardLayout.Root name="dashboard-story" className="h-full w-full">
        <DashboardLayout.Navbar>navbar content</DashboardLayout.Navbar>
        <DashboardLayout.Content>
          <Sidebar.Root variant="floating">
            <Sidebar.Header>
              <Sidebar.Item>Header</Sidebar.Item>
            </Sidebar.Header>
            <Sidebar.Content>
              <Sidebar.Group>
                <Sidebar.GroupLabel>Resources</Sidebar.GroupLabel>
                <Sidebar.GroupAction>
                  <Plus />
                </Sidebar.GroupAction>
                <Sidebar.GroupContent>
                  <Sidebar.Menu>
                    <Sidebar.MenuItem>
                      <Sidebar.MenuButton
                        render={<NavLink to="/1" />}
                        aria-current="page"
                        icon={<LinkIcon />}
                        rightIcon={<Sidebar.MenuBadge>11</Sidebar.MenuBadge>}
                      >
                        Short links
                      </Sidebar.MenuButton>
                    </Sidebar.MenuItem>
                    <Sidebar.MenuItem>
                      <Sidebar.MenuAction>
                        <PlusIcon />
                      </Sidebar.MenuAction>
                      <Sidebar.MenuButton
                        render={<NavLink to="/2" />}
                        icon={<QrCodeIcon />}
                      >
                        QR codes
                      </Sidebar.MenuButton>
                    </Sidebar.MenuItem>
                    <Sidebar.MenuItem>
                      <Sidebar.MenuButton
                        render={<NavLink to="/3" />}
                        icon={<LayoutPanelTopIcon />}
                      >
                        Link in bio
                      </Sidebar.MenuButton>
                    </Sidebar.MenuItem>
                    <Sidebar.MenuItem>
                      <Sidebar.MenuButton
                        render={<NavLink to="/4" />}
                        icon={<ChartColumnBigIcon />}
                      >
                        Insights
                      </Sidebar.MenuButton>
                    </Sidebar.MenuItem>
                    <Collapsible render={<Sidebar.MenuItem />}>
                      <CollapsibleTrigger
                        render={
                          <Sidebar.MenuButton
                            icon={<BrainIcon />}
                            rightIcon={
                              <ChevronRightIcon className="ml-auto transition-transform group-data-open/menu-item:rotate-90" />
                            }
                          />
                        }
                      >
                        Models
                      </CollapsibleTrigger>
                      <CollapsibleContent render={<Sidebar.MenuSub />}>
                        <Sidebar.MenuSubItem>
                          <Sidebar.MenuSubButton>Genesis</Sidebar.MenuSubButton>
                        </Sidebar.MenuSubItem>
                        <Sidebar.MenuSubItem>
                          <Sidebar.MenuSubButton>
                            Explorer
                          </Sidebar.MenuSubButton>
                        </Sidebar.MenuSubItem>
                        <Sidebar.MenuSubItem>
                          <Sidebar.MenuSubButton>Quantum</Sidebar.MenuSubButton>
                        </Sidebar.MenuSubItem>
                      </CollapsibleContent>
                    </Collapsible>
                    <Sidebar.MenuItem>
                      <Sidebar.MenuButton
                        render={<NavLink to="/5" />}
                        icon={<BrainIcon />}
                      >
                        Models
                      </Sidebar.MenuButton>
                      <Sidebar.MenuSub>
                        <Sidebar.MenuSubItem>
                          <Sidebar.MenuSubButton>Genesis</Sidebar.MenuSubButton>
                        </Sidebar.MenuSubItem>
                        <Sidebar.MenuSubItem>
                          <Sidebar.MenuSubButton>
                            Explorer
                          </Sidebar.MenuSubButton>
                        </Sidebar.MenuSubItem>
                        <Sidebar.MenuSubItem>
                          <Sidebar.MenuSubButton>Quantum</Sidebar.MenuSubButton>
                        </Sidebar.MenuSubItem>
                      </Sidebar.MenuSub>
                    </Sidebar.MenuItem>
                  </Sidebar.Menu>
                </Sidebar.GroupContent>
              </Sidebar.Group>

              <Sidebar.Group>
                <Sidebar.GroupLabel>Resources</Sidebar.GroupLabel>
                <Sidebar.GroupContent>
                  <Sidebar.Menu>
                    <Sidebar.MenuItem>
                      <Sidebar.MenuButton
                        render={<NavLink to="/5" />}
                        icon={<FolderIcon />}
                      >
                        Folders
                      </Sidebar.MenuButton>
                      <Sidebar.MenuButton
                        render={<NavLink to="/6" />}
                        icon={<GlobeIcon />}
                      >
                        Domains
                      </Sidebar.MenuButton>
                      <Sidebar.MenuButton
                        render={<NavLink to="/7" />}
                        icon={<MousePointer2Icon />}
                      >
                        Tracking pixels
                      </Sidebar.MenuButton>
                    </Sidebar.MenuItem>
                  </Sidebar.Menu>
                </Sidebar.GroupContent>
              </Sidebar.Group>

              <Sidebar.Group>
                <Sidebar.GroupLabel
                  render={<Button variant="ghost" size="sm" />}
                >
                  Usage <ChevronRightIcon data-icon="inline-end" />
                </Sidebar.GroupLabel>
                <Sidebar.GroupContent>
                  <Sidebar.Item>
                    <Meter value={24} className="text-xs">
                      <MeterLabel>
                        <LinkIcon /> Links
                      </MeterLabel>
                      <MeterValue>{() => '34 of 112'}</MeterValue>
                      <MeterTrack className="h-0.5">
                        <MeterIndicator />
                      </MeterTrack>
                    </Meter>
                  </Sidebar.Item>
                </Sidebar.GroupContent>
              </Sidebar.Group>
            </Sidebar.Content>

            <Sidebar.Separator />

            <Sidebar.Footer>
              <Sidebar.Item>Active workspace</Sidebar.Item>
            </Sidebar.Footer>
          </Sidebar.Root>
          <DashboardLayout.MainSection>
            <div className="border-b p-2">
              <DashboardLayout.SidebarToggle />
            </div>
            <div className="p-6">dashboard content</div>
          </DashboardLayout.MainSection>
        </DashboardLayout.Content>
      </DashboardLayout.Root>
    </MemoryRouter>
  ),
});
