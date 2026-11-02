<?php

// Exact pre-redesign stock homepage. Used only to migrate unmodified site settings.
return [
            'sections' => [
                [
                    'name' => 'hero-split-with-screenshot',
                    'badge' => 'Short links · Storefront · QR codes',
                    'title' => 'Every link you share, built to convert',
                    'description' =>
                        'Shorten URLs, launch beautiful link-in-bio pages, and track every click, all from one dashboard. Branded domains, deep analytics, and tools your whole team can use.',
                    'showSearchBarSlot' => true,
                    'image' => [
                        'src' => 'images/landing/links.webp',
                        'width' => 2432,
                        'height' => 1442,
                    ],
                ],

                [
                    'name' => 'features-grid',
                    'badge' => 'Everything in one place',
                    'title' => 'Links that work harder for you',
                    'description' =>
                        "Whether you're sharing one campaign link or building a full link-in-bio, Linket gives you the tools to create, brand, and measure every touchpoint.",
                    'maxColumns' => 3,
                    'iconsOnTop' => true,
                    'mutedBg' => true,
                    'features' => [
                        [
                            'icon' => 'links',
                            'title' => 'Branded short links',
                            'description' =>
                                'Create memorable short URLs with custom back-halves, folders, and your own domain, so every link looks like you.',
                        ],
                        [
                            'icon' => 'stores',
                            'title' => 'Link-in-bio pages',
                            'description' =>
                                'Build a mobile-first page that houses all your content, social profiles, and CTAs in one shareable link.',
                        ],
                        [
                            'icon' => 'insights',
                            'title' => 'Click analytics',
                            'description' =>
                                "See what's working with real-time click data, device and location breakdowns, and insights across all your links.",
                        ],
                    ],
                ],

                [
                    'name' => 'feature-with-screenshot',
                    'badge' => 'Short links',
                    'title' => 'Short URLs with serious control',
                    'description' =>
                        'Go beyond basic shortening. Customize every link, organize campaigns in folders, and route visitors with smart rules, without leaving your dashboard.',
                    'alignLeft' => false,
                    'wrapIconsInBg' => true,
                    'imageSize' => 'lg',
                    'image' => [
                        'src' => 'images/landing/new-link.webp',
                        'width' => 2432,
                        'height' => 1442,
                    ],
                    'features' => [
                        [
                            'icon' => 'back_half',
                            'title' => 'Custom back-halves',
                            'description' =>
                                'Choose short, readable slugs that match your brand and are easy to say out loud.',
                        ],
                        [
                            'icon' => 'settings',
                            'title' => 'Link types & splash pages',
                            'description' =>
                                'Send visitors straight through, show a branded splash page, or use a custom link page before they arrive.',
                        ],
                        [
                            'icon' => 'retargeting',
                            'title' => 'Retargeting rules',
                            'description' =>
                                'Route clicks by device, location, or platform so the right audience always lands in the right place.',
                        ],
                    ],
                ],

                [
                    'name' => 'feature-with-screenshot',
                    'badge' => 'Storefront',
                    'title' => 'One link for everything you share',
                    'description' =>
                        'Replace a messy list of links with a polished page that reflects your brand. Add buttons, images, embeds, and more, then update it anytime.',
                    'alignLeft' => true,
                    'wrapIconsInBg' => true,
                    'imageSize' => 'lg',
                    'image' => [
                        'src' => 'images/landing/biolink.webp',
                        'width' => 2432,
                        'height' => 1442,
                    ],
                    'features' => [
                        [
                            'icon' => 'drag-handle',
                            'title' => 'Drag-and-drop editor',
                            'description' =>
                                'Arrange widgets, pin important links, and preview your page on mobile before you publish.',
                        ],
                        [
                            'icon' => 'brand',
                            'title' => 'Fully on-brand',
                            'description' =>
                                'Custom colors, fonts, and layouts, plus optional custom domains so your bio link matches your website.',
                        ],
                        [
                            'icon' => 'insights',
                            'title' => 'Track bio page views',
                            'description' =>
                                'Measure profile visits and link clicks to learn what your audience actually engages with.',
                        ],
                    ],
                ],

                [
                    'name' => 'feature-with-screenshot',
                    'badge' => 'QR codes',
                    'title' => 'Turn any link into a scannable code',
                    'description' =>
                        'Generate QR codes for short links and link-in-bio pages in one click. Download, print, and track scans alongside your other link analytics.',
                    'alignLeft' => false,
                    'wrapIconsInBg' => true,
                    'imageSize' => 'lg',
                    'image' => [
                        'src' => 'images/landing/qr-codes.webp',
                        'width' => 2432,
                        'height' => 1442,
                    ],
                    'features' => [
                        [
                            'icon' => 'fast',
                            'title' => 'Instant generation',
                            'description' =>
                                'Create a QR code for any short link or biolink the moment you need it: no extra tools or exports required.',
                        ],
                        [
                            'icon' => 'date',
                            'title' => 'Always up to date',
                            'description' =>
                                'Point a printed code at a link you control. Update the destination anytime without reprinting the QR code.',
                        ],
                        [
                            'icon' => 'insights',
                            'title' => 'Track every scan',
                            'description' =>
                                'See how often your codes get scanned, alongside clicks and visits from the rest of your Linket dashboard.',
                        ],
                    ],
                ],

                [
                    'name' => 'features-grid',
                    'badge' => 'Built for growth',
                    'title' => 'The toolkit serious marketers expect',
                    'description' =>
                        'From solo creators to growing teams, Linket scales with the features you need to manage links at volume.',
                    'maxColumns' => 3,
                    'iconsOnTop' => true,
                    'features' => [
                        [
                            'icon' => 'custom-domains',
                            'title' => 'Custom domains',
                            'description' =>
                                'Connect your own domain and serve short links from your brand, not ours.',
                        ],
                        [
                            'icon' => 'folders',
                            'title' => 'Folders & workspaces',
                            'description' =>
                                'Organize links by client or campaign, and collaborate with teammates under shared workspaces.',
                        ],
                        [
                            'icon' => 'pixels',
                            'title' => 'Tracking pixels',
                            'description' =>
                                'Fire Facebook, Google, and other pixels on link clicks to keep ad attribution accurate.',
                        ],
                        [
                            'icon' => 'link-overlays',
                            'title' => 'CTA overlays',
                            'description' =>
                                'Add promotional banners and calls-to-action on top of any destination page.',
                        ],
                        [
                            'icon' => 'link-pages',
                            'title' => 'Link pages',
                            'description' =>
                                'Build lightweight landing pages for campaigns without sending traffic off-platform first.',
                        ],
                        [
                            'icon' => 'api',
                            'title' => 'API & webhooks',
                            'description' =>
                                'Automate link creation and get notified when links are clicked. Integrate Linket into your stack.',
                        ],
                    ],
                ],

                [
                    'name' => 'stats',
                ],

                [
                    'name' => 'pricing',
                    'title' => 'Plans that grow with your links',
                    'description' =>
                        'Start free and upgrade when you need more links, clicks, custom domains, or team seats. Switch between monthly and yearly billing anytime.',
                ],

                [
                    'name' => 'cta-simple-centered',
                    'title' => 'Start sharing smarter links today',
                    'description' =>
                        'Create your first short link or link-in-bio page in minutes. No credit card required to get started.',
                    'buttons' => [
                        [
                            'label' => 'Create free account',
                            'action' => '/register',
                            'type' => 'route',
                            'variant' => 'default',
                            'color' => 'primary',
                        ],
                    ],
                ],

                [
                    'name' => 'footer',
                ],
            ],
        ];
