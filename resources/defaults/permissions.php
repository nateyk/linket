<?php

return [
    'roles' => [
        [
            'name' => 'Users',
            'default' => true,
            'internal' => true,
            'type' => 'users',
            'permissions' => [
                // API
                'api.access',
                'files.create',

                // SUPPORT (BeDesk-native)
                'articles.view',
                'conversations.create',

                // COMMENTS
                'comments.create',
                'comments.view',

                // LINKS
                [
                    'name' => 'links.create',
                    'restrictions' => [
                        [
                            'name' => 'count',
                            'value' => 20,
                        ],
                        [
                            'name' => 'click_count',
                            'value' => 5000,
                        ],
                    ],
                ],

                // FOLDERS
                [
                    'name' => 'folders.create',
                    'restrictions' => [
                        [
                            'name' => 'count',
                            'value' => 5,
                        ],
                    ],
                ],

                // STORES (canonical)
                [
                    'name' => 'stores.create',
                    'restrictions' => [
                        [
                            'name' => 'count',
                            'value' => 3,
                        ],
                    ],
                ],

                // BIOLINKS (deprecated alias, keep for BC)
                [
                    'name' => 'biolinks.create',
                    'restrictions' => [
                        [
                            'name' => 'count',
                            'value' => 3,
                        ],
                    ],
                ],

                // CUSTOM DOMAINS
                [
                    'name' => 'custom_domains.create',
                    'restrictions' => [
                        [
                            'name' => 'count',
                            'value' => 5,
                        ],
                    ],
                ],

                // LINK OVERLAYS
                [
                    'name' => 'link_overlays.create',
                    'restrictions' => [
                        [
                            'name' => 'count',
                            'value' => 5,
                        ],
                    ],
                ],

                // LINK PAGES
                [
                    'name' => 'custom_pages.create',
                    'restrictions' => [
                        [
                            'name' => 'count',
                            'value' => 5,
                        ],
                    ],
                ],

                // TRACKING PIXELS
                [
                    'name' => 'tracking_pixels.create',
                    'restrictions' => [
                        [
                            'name' => 'count',
                            'value' => 5,
                        ],
                    ],
                ],

                // WEBHOOKS
                [
                    'name' => 'webhooks.create',
                    'restrictions' => [
                        [
                            'name' => 'count',
                            'value' => 5,
                        ],
                    ],
                ],

                // WORKSPACES
                [
                    'name' => 'workspaces.create',
                    'restrictions' => [
                        [
                            'name' => 'count',
                            'value' => 4,
                        ],
                        [
                            'name' => 'member_count',
                            'value' => 5,
                        ],
                    ],
                ],
            ],
        ],

        [
            'name' => 'Guests',
            'internal' => true,
            'guests' => true,
            'type' => 'users',
            'permissions' => [
                'links.create',
                'articles.view',
                'conversations.create',
                'files.create',
            ],
        ],

        [
            'name' => 'Agents',
            'default' => false,
            'guests' => false,
            'type' => 'agents',
            'permission_type' => 'users',
            'permissions' => [
                'articles.view',
                'articles.update',
                'conversations.update',
                'users.update',
                'tags.update',
                'files.create',
                'agents.update',
                'views.update',
                'statuses.update',
                'reports.view',
                'canned_replies.update',
                'campaigns.update',
            ],
        ],

        [
            'name' => 'Admin',
            'type' => 'workspace',
            'description' =>
                'Manage all workspace content, invite and manage members.',
            'permissions' => [
                'workspace_members.invite',
                'workspace_members.update',
                'workspace_members.delete',
                'links.create',
                'links.update',
                'links.delete',
                'link_overlays.create',
                'link_overlays.update',
                'link_overlays.delete',
                'custom_pages.create',
                'custom_pages.update',
                'custom_pages.delete',
                'stores.create',
                'stores.update',
                'stores.delete',
                'biolinks.create',
                'biolinks.update',
                'biolinks.delete',
                'custom_domains.create',
                'custom_domains.update',
                'custom_domains.delete',
                'folders.create',
                'folders.update',
                'folders.delete',
                'tracking_pixels.create',
                'tracking_pixels.update',
                'tracking_pixels.delete',
                'webhooks.create',
                'webhooks.update',
                'webhooks.delete',
            ],
        ],
        [
            'name' => 'Editor',
            'type' => 'workspace',
            'description' =>
                'Manage all workspace resources, regardless of resource owner.',
            'permissions' => [
                'links.create',
                'links.update',
                'links.delete',
                'link_overlays.create',
                'link_overlays.update',
                'link_overlays.delete',
                'custom_pages.create',
                'custom_pages.update',
                'custom_pages.delete',
                'stores.create',
                'stores.update',
                'stores.delete',
                'biolinks.create',
                'biolinks.update',
                'biolinks.delete',
                'custom_domains.create',
                'custom_domains.update',
                'custom_domains.delete',
                'folders.create',
                'folders.update',
                'folders.delete',
                'tracking_pixels.create',
                'tracking_pixels.update',
                'tracking_pixels.delete',
                'webhooks.create',
                'webhooks.update',
                'webhooks.delete',
            ],
        ],
        [
            'name' => 'Member',
            'type' => 'workspace',
            'description' =>
                "Create workspace resources, but can't edit or delete resources owned by other members.",
            'permissions' => [
                'links.create',
                'link_overlays.create',
                'custom_pages.create',
                'stores.create',
                'biolinks.create',
                'custom_domains.create',
                'folders.create',
                'tracking_pixels.create',
                'webhooks.create',
            ],
        ],
    ],
    'all' => [
        'Support' => [
            [
                'name' => 'articles.view',
                'display_name' => 'View help center',
                'description' =>
                    'Allow viewing of all help center articles and categories.',
            ],
            [
                'name' => 'conversations.create',
                'display_name' => 'Start conversations',
                'description' =>
                    'Allow creating new conversations via email, ticket portal, or other channels.',
            ],
            [
                'name' => 'conversations.update',
                'display_name' => 'Manage conversations',
                'description' =>
                    'Allow full access to conversations in the agent inbox.',
            ],
            [
                'name' => 'articles.update',
                'display_name' => 'Manage help center',
                'description' =>
                    'Allow editing of all help center articles and categories.',
            ],
            [
                'name' => 'canned_replies.update',
                'display_name' => 'Manage saved replies',
                'description' =>
                    'Allow creating and editing canned replies for the agent inbox.',
            ],
            [
                'name' => 'campaigns.update',
                'display_name' => 'Manage campaigns',
                'description' =>
                    'Allow creating and editing live chat campaigns.',
            ],
            [
                'name' => 'agents.update',
                'display_name' => 'Manage agents',
                'description' => 'Allow team management.',
            ],
            [
                'name' => 'views.update',
                'display_name' => 'Manage inbox views',
                'description' => 'Allow managing conversation inbox views.',
            ],
            [
                'name' => 'statuses.update',
                'display_name' => 'Manage statuses',
                'description' => 'Allow managing conversation statuses.',
            ],
            [
                'name' => 'triggers.update',
                'display_name' => 'Manage triggers',
                'description' => 'Allow managing automation triggers.',
            ],
            [
                'name' => 'attributes.update',
                'display_name' => 'Manage custom attributes',
                'description' =>
                    'Allow creating and editing custom attributes for conversations and contacts.',
            ],
        ],
        'Features' => [
            [
                'name' => 'links.create',
                'role_types' => ['users'],
                'display_name' => 'Links',
                'description' => 'Allows access to link shortening feature.',
                'restrictions' => [
                    [
                        'name' => 'count',
                        'display_name' => 'Links count',
                        'type' => 'number',
                        'description' =>
                            'Maximum number of links user will be able to create. Leave empty for unlimited.',
                    ],
                    [
                        'name' => 'click_count',
                        'display_name' => 'Clicks count',
                        'type' => 'number',
                        'description' =>
                            'Maximum number of clicks/visits allowed per month for all user urls. Leave empty for unlimited.',
                    ],
                    [
                        'name' => 'back_half',
                        'display_name' => 'Back half',
                        'type' => 'bool',
                        'description' =>
                            'Whether user is allowed to set custom back half for links.',
                    ],
                    [
                        'name' => 'expiration',
                        'display_name' => 'Expiration',
                        'type' => 'bool',
                        'description' =>
                            'Whether user is allowed to set expiration date or clicks for links.',
                    ],
                    [
                        'name' => 'password',
                        'display_name' => 'Password',
                        'type' => 'bool',
                        'description' =>
                            'Whether user is allowed to set password for links.',
                    ],
                    [
                        'name' => 'utm',
                        'display_name' => 'UTM',
                        'type' => 'bool',
                        'description' =>
                            'Whether user is allowed to use utm builder when shortening links.',
                    ],
                    [
                        'name' => 'retargeting',
                        'display_name' => 'Retargeting',
                        'type' => 'bool',
                        'description' =>
                            'Whether user is allowed to use location, device and platform retargeting features.',
                    ],
                ],
            ],

            [
                'name' => 'qr_codes.create',
                'role_types' => ['users'],
                'display_name' => 'QR codes',
                'description' => 'Allows access to QR codes feature.',
                'restrictions' => [
                    [
                        'name' => 'count',
                        'display_name' => 'QR codes count',
                        'type' => 'number',
                        'description' =>
                            'Maximum number of QR codes user will be able to create. Leave empty for unlimited.',
                    ],
                    [
                        'name' => 'style',
                        'display_name' => 'QR code style',
                        'type' => 'bool',
                        'description' =>
                            'Whether user is allowed to customize QR code style.',
                    ],
                ],
            ],

            [
                'name' => 'workspaces.create',
                'role_types' => ['users'],
                'display_name' => 'Workspaces',
                'description' => 'Allows access to workspaces feature.',
                'restrictions' => [
                    [
                        'name' => 'count',
                        'display_name' => 'Workspaces count',
                        'type' => 'number',
                        'description' => __('policies.count_description', [
                            'resources' => 'workspaces',
                        ]),
                    ],
                    [
                        'name' => 'member_count',
                        'display_name' => 'Members count',
                        'type' => 'number',
                        'description' =>
                            'Maximum number of members workspace is allowed to have.',
                    ],
                ],
            ],
            [
                'name' => 'api.access',
                'role_types' => ['users'],
                'display_name' => 'REST API',
                'description' =>
                    'Allow usage of REST API and accessing API section in account settings page.',
            ],
            [
                'name' => 'link_overlays.create',
                'role_types' => ['users'],
                'display_name' => 'Link overlays',
                'description' => 'Allows access to link overlays feature.',
                'restrictions' => [
                    [
                        'name' => 'count',
                        'display_name' => 'Link overlays count',
                        'type' => 'number',
                        'description' => __('policies.count_description', [
                            'resources' => 'overlays',
                        ]),
                    ],
                ],
            ],
            [
                'name' => 'custom_pages.create',
                'role_types' => ['users'],
                'display_name' => 'Link pages',
                'description' => 'Allows access to link pages feature.',
                'restrictions' => [
                    [
                        'name' => 'count',
                        'display_name' => 'Link pages count',
                        'type' => 'number',
                        'description' => __('policies.count_description', [
                            'resources' => 'pages',
                        ]),
                    ],
                    [
                        'name' => 'options',
                        'display_name' => 'Link pages options',
                        'type' => 'bool',
                        'description' =>
                            'Whether user should be able to hide navbar and footer.',
                    ],
                ],
            ],
            [
                'name' => 'folders.create',
                'role_types' => ['users'],
                'display_name' => 'Folders',
                'description' => 'Allows access to folders feature.',
                'restrictions' => [
                    [
                        'name' => 'count',
                        'display_name' => 'Folders count',
                        'type' => 'number',
                        'description' => __('policies.count_description', [
                            'resources' => 'folders',
                        ]),
                    ],
                ],
            ],
            [
                'name' => 'stores.create',
                'role_types' => ['users'],
                'display_name' => 'Stores',
                'description' => 'Allows access to stores feature.',
                'restrictions' => [
                    [
                        'name' => 'count',
                        'display_name' => 'Stores count',
                        'type' => 'number',
                        'description' => __('policies.count_description', [
                            'resources' => 'stores',
                        ]),
                    ],
                ],
            ],
            [
                'name' => 'biolinks.create',
                'role_types' => ['users'],
                'display_name' => 'Biolinks',
                'description' => 'Allows access to biolinks feature.',
                'restrictions' => [
                    [
                        'name' => 'count',
                        'display_name' => 'Biolinks count',
                        'type' => 'number',
                        'description' => __('policies.count_description', [
                            'resources' => 'biolinks',
                        ]),
                    ],
                ],
            ],
            [
                'name' => 'tracking_pixels.create',
                'role_types' => ['users'],
                'display_name' => 'Tracking pixels',
                'description' => 'Allows access to tracking pixels feature.',
                'restrictions' => [
                    [
                        'name' => 'count',
                        'display_name' => 'Tracking pixels count',
                        'type' => 'number',
                        'description' => __('policies.count_description', [
                            'resources' => 'pixels',
                        ]),
                    ],
                ],
            ],
            [
                'name' => 'webhooks.create',
                'role_types' => ['users'],
                'display_name' => 'Webhooks',
                'description' =>
                    'Allows users to create and manage webhook endpoints.',
                'restrictions' => [
                    [
                        'name' => 'count',
                        'display_name' => 'Webhooks count',
                        'type' => 'number',
                        'description' => __('policies.count_description', [
                            'resources' => 'webhooks',
                        ]),
                    ],
                ],
            ],
        ],
        'Comments' => [
            [
                'name' => 'comments.create',
                'role_types' => ['users'],
                'display_name' => 'Create comments',
                'description' => 'Allow creating comments.',
            ],
            [
                'name' => 'comments.view',
                'role_types' => ['users'],
                'display_name' => 'View all comments',
                'description' => 'Allow viewing all comments, not just own.',
            ],
            [
                'name' => 'comments.update',
                'role_types' => ['users'],
                'display_name' => 'Edit comments',
                'description' => 'Allow editing all comments.',
            ],
            [
                'name' => 'comments.delete',
                'role_types' => ['users'],
                'display_name' => 'Delete comments',
                'description' => 'Allow deleting all comments.',
            ],
        ],
        'Admin area' => [
            [
                'name' => 'admin.access',
                'role_types' => ['users'],
                'display_name' => 'Access admin area',
                'description' =>
                    'Required in order to access any admin area page.',
            ],
            [
                'name' => 'admin',
                'role_types' => ['users'],
                'display_name' => 'Super admin',
                'description' => 'Gives full permissions.',
            ],
            [
                'name' => 'reports.view',
                'role_types' => ['users'],
                'display_name' => 'View reports',
                'description' => 'Allow viewing reports.',
            ],
            [
                'name' => 'settings.update',
                'role_types' => ['users'],
                'display_name' => 'Manage settings',
                'description' => 'Allow settings management from admin area.',
            ],
            [
                'name' => 'roles.update',
                'role_types' => ['users'],
                'display_name' => 'Role management',
                'description' => 'Allow role management from admin area.',
            ],
            [
                'name' => 'users.update',
                'role_types' => ['users'],
                'display_name' => 'Manage users',
                'description' => 'Allow user management from admin area.',
            ],
            [
                'name' => 'subscriptions.update',
                'role_types' => ['users'],
                'display_name' => 'Manage subscriptions',
                'description' =>
                    'Allow subscription and plan management from admin area.',
            ],
            [
                'name' => 'localizations.update',
                'role_types' => ['users'],
                'display_name' => 'Manage localizations',
                'description' =>
                    'Allow localization management from admin area.',
            ],
            [
                'name' => 'files.create',
                'role_types' => ['users'],
                'display_name' => 'Upload files',
                'description' => 'Allow users to upload files.',
            ],
            [
                'name' => 'files.update',
                'role_types' => ['users'],
                'display_name' => 'Manage files',
                'description' => 'Allow file management from admin area.',
            ],
            [
                'name' => 'tags.update',
                'role_types' => ['users'],
                'display_name' => 'Manage tags',
                'description' => 'Allow tag management from admin area.',
            ],
            [
                'name' => 'links.update',
                'role_types' => ['users'],
                'display_name' => 'Manage links',
                'description' => 'Allow link management from admin area.',
            ],
            [
                'name' => 'link_overlays.update',
                'role_types' => ['users'],
                'display_name' => 'Manage link overlays',
                'description' =>
                    'Allows link overlay management from admin area.',
            ],
            [
                'name' => 'custom_pages.update',
                'role_types' => ['users'],
                'display_name' => 'Manage link pages',
                'description' => 'Allows link page management from admin area.',
            ],
            [
                'name' => 'folders.update',
                'role_types' => ['users'],
                'display_name' => 'Manage folders',
                'description' => 'Allows folder management from admin area.',
            ],
            [
                'name' => 'stores.update',
                'role_types' => ['users'],
                'display_name' => 'Manage stores',
                'description' => 'Allows store management from admin area.',
            ],
            [
                'name' => 'biolinks.update',
                'role_types' => ['users'],
                'display_name' => 'Manage biolinks',
                'description' => 'Allows biolink management from admin area.',
            ],
            [
                'name' => 'tracking_pixels.update',
                'role_types' => ['users'],
                'display_name' => 'Manage tracking pixels',
                'description' =>
                    'Allows tracking pixel management from admin area.',
            ],
        ],
        'Workspace members' => [
            [
                'name' => 'workspace_members.invite',
                'display_name' => 'Invite Members',
                'role_types' => ['workspace'],
                'description' =>
                    'Allow user to invite new members into a workspace.',
            ],
            [
                'name' => 'workspace_members.update',
                'display_name' => 'Update Members',
                'role_types' => ['workspace'],
                'description' => 'Allow user to change role of other members.',
            ],
            [
                'name' => 'workspace_members.delete',
                'display_name' => 'Delete Members',
                'role_types' => ['workspace'],
                'description' => 'Allow user to remove members from workspace.',
            ],
        ],
        'Workspace resources' => [
            [
                'name' => 'links.create',
                'display_name' => 'Create links',
                'role_types' => ['workspace'],
                'description' => 'Allow creating links in the workspace.',
            ],
            [
                'name' => 'links.update',
                'display_name' => 'Edit links',
                'role_types' => ['workspace'],
                'description' => 'Allow editing all links in the workspace.',
            ],
            [
                'name' => 'links.delete',
                'display_name' => 'Delete links',
                'role_types' => ['workspace'],
                'description' => 'Allow deleting all links in the workspace.',
            ],

            [
                'name' => 'link_overlays.create',
                'display_name' => 'Create link overlays',
                'role_types' => ['workspace'],
                'description' =>
                    'Allow creating link overlays in the workspace.',
            ],
            [
                'name' => 'link_overlays.update',
                'display_name' => 'Edit link overlays',
                'role_types' => ['workspace'],
                'description' =>
                    'Allow editing all link overlays in the workspace.',
            ],
            [
                'name' => 'link_overlays.delete',
                'display_name' => 'Delete link overlays',
                'role_types' => ['workspace'],
                'description' =>
                    'Allow deleting all link overlays in the workspace.',
            ],

            [
                'name' => 'custom_pages.create',
                'display_name' => 'Create link pages',
                'role_types' => ['workspace'],
                'description' => 'Allow creating link pages in the workspace.',
            ],
            [
                'name' => 'custom_pages.update',
                'display_name' => 'Edit link pages',
                'role_types' => ['workspace'],
                'description' =>
                    'Allow editing all link pages in the workspace.',
            ],
            [
                'name' => 'custom_pages.delete',
                'display_name' => 'Delete link pages',
                'role_types' => ['workspace'],
                'description' =>
                    'Allow deleting all link pages in the workspace.',
            ],

            [
                'name' => 'folders.create',
                'display_name' => 'Create folders',
                'role_types' => ['workspace'],
                'description' => 'Allow creating folders in the workspace.',
            ],
            [
                'name' => 'folders.update',
                'display_name' => 'Edit folders',
                'role_types' => ['workspace'],
                'description' => 'Allow editing all folders in the workspace.',
            ],
            [
                'name' => 'folders.delete',
                'display_name' => 'Delete folders',
                'role_types' => ['workspace'],
                'description' => 'Allow deleting all folders in the workspace.',
            ],

            [
                'name' => 'stores.create',
                'display_name' => 'Create stores',
                'role_types' => ['workspace'],
                'description' => 'Allow creating stores in the workspace.',
            ],
            [
                'name' => 'stores.update',
                'display_name' => 'Edit stores',
                'role_types' => ['workspace'],
                'description' => 'Allow editing all stores in the workspace.',
            ],
            [
                'name' => 'stores.delete',
                'display_name' => 'Delete stores',
                'role_types' => ['workspace'],
                'description' => 'Allow deleting all stores in the workspace.',
            ],
            [
                'name' => 'biolinks.create',
                'display_name' => 'Create biolinks',
                'role_types' => ['workspace'],
                'description' => 'Allow creating biolinks in the workspace.',
            ],
            [
                'name' => 'biolinks.update',
                'display_name' => 'Edit biolinks',
                'role_types' => ['workspace'],
                'description' => 'Allow editing all biolinks in the workspace.',
            ],
            [
                'name' => 'biolinks.delete',
                'display_name' => 'Delete biolinks',
                'role_types' => ['workspace'],
                'description' =>
                    'Allow deleting all biolinks in the workspace.',
            ],

            [
                'name' => 'tracking_pixels.create',
                'display_name' => 'Create tracking pixels',
                'role_types' => ['workspace'],
                'description' =>
                    'Allow creating tracking pixels in the workspace.',
            ],
            [
                'name' => 'tracking_pixels.update',
                'display_name' => 'Edit tracking pixels',
                'role_types' => ['workspace'],
                'description' =>
                    'Allow editing all tracking pixels in the workspace.',
            ],
            [
                'name' => 'tracking_pixels.delete',
                'display_name' => 'Delete tracking pixels',
                'role_types' => ['workspace'],
                'description' =>
                    'Allow deleting all tracking pixels in the workspace.',
            ],

            [
                'name' => 'webhooks.create',
                'display_name' => 'Create webhooks',
                'role_types' => ['workspace'],
                'description' =>
                    'Allow creating webhook endpoints in the workspace.',
            ],
            [
                'name' => 'webhooks.update',
                'display_name' => 'Edit webhooks',
                'role_types' => ['workspace'],
                'description' =>
                    'Allow editing all webhook endpoints in the workspace.',
            ],
            [
                'name' => 'webhooks.delete',
                'display_name' => 'Delete webhooks',
                'role_types' => ['workspace'],
                'description' =>
                    'Allow deleting all webhook endpoints in the workspace.',
            ],
        ],
    ],
];
