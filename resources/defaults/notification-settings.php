<?php

return [
    'available_channels' => ['browser', 'email', 'slack'],
    'subscriptions' => [
        [
            'group_name' => 'Tickets',
            'subscriptions' => [
                [
                    'name' => 'New conversation created',
                    'notif_id' => '01',
                    'permissions' => ['conversations.update'],
                    'user_type' => 'agent',
                ],
                [
                    'name' => 'Conversation assigned to me',
                    'notif_id' => '02',
                    'permissions' => ['conversations.update'],
                    'user_type' => 'agent',
                ],
                [
                    'name' => 'Conversation assigned to someone else',
                    'notif_id' => '03',
                    'permissions' => ['conversations.update'],
                    'user_type' => 'agent',
                ],
                [
                    'name' => 'Customer replied to unassigned conversation',
                    'notif_id' => '04',
                    'permissions' => ['conversations.update'],
                    'user_type' => 'agent',
                ],
                [
                    'name' => 'Customer replied to my conversation',
                    'notif_id' => '05',
                    'permissions' => ['conversations.update'],
                    'user_type' => 'agent',
                ],
                [
                    'name' => 'Customer replied to someone else\'s conversation',
                    'notif_id' => '06',
                    'permissions' => ['conversations.update'],
                    'user_type' => 'agent',
                ],
                [
                    'name' => 'Agent replied to unassigned conversation',
                    'notif_id' => '07',
                    'permissions' => ['conversations.update'],
                    'user_type' => 'agent',
                ],
                [
                    'name' => 'Agent replied to my conversation',
                    'notif_id' => '08',
                    'permissions' => ['conversations.update'],
                    'user_type' => 'agent',
                ],
                [
                    'name' => 'Agent replied to someone else\'s conversation',
                    'notif_id' => '09',
                    'permissions' => ['conversations.update'],
                    'user_type' => 'agent',
                ],
            ],
        ],
        [
            'group_name' => 'Workspaces',
            'subscriptions' => [
                [
                    'name' => 'Workspace invitation',
                    'notif_id' => 'W01',
                ],
            ],
        ],
    ],
];
