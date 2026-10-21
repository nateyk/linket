<?php

namespace Database\Seeders;

use App\CreatorServices\Models\ServiceCategory;
use App\CreatorServices\Models\ServiceSubcategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ServiceCategoriesSeeder extends Seeder
{
    /**
     * @return array<string, array<int, string>>
     */
    private function categories(): array
    {
        return [
            'Graphics & Design' => [
                'Logo Design',
                'Brand Identity',
                'Social Media Design',
                'Business & Stationery Design',
                'Illustration',
                'Print Design',
                'Packaging & Label Design',
                'Presentation Design',
                'Infographic Design',
                'UI/UX Design',
                'Web & App Design',
                '3D Design',
                'Book & Cover Design',
                'Photo Editing & Retouching',
            ],
            'Digital Marketing' => [
                'Search Engine Optimization (SEO)',
                'Social Media Marketing',
                'Social Media Management',
                'Search Engine Marketing (SEM)',
                'Display Advertising',
                'Email Marketing',
                'Content Marketing',
                'Influencer Marketing',
                'Affiliate Marketing',
                'E-commerce Marketing',
                'Marketing Strategy',
                'Conversion Rate Optimization',
                'Local SEO',
                'Analytics & Tracking Setup',
            ],
            'Programming & Tech' => [
                'Website Development',
                'E-commerce Development',
                'WordPress Development',
                'Mobile App Development',
                'Web Applications',
                'Software Development',
                'Bug Fixing & Troubleshooting',
                'API Development & Integration',
                'Database Development',
                'DevOps & Cloud',
                'Cybersecurity',
                'QA & Testing',
                'Game Development',
                'Bots & Integrations',
                'Technical Support',
            ],
            'Video & Animation' => [
                'Video Editing',
                'Short-Form Video',
                'YouTube Video Production',
                'Logo Animation',
                '2D Animation',
                '3D Animation',
                'Motion Graphics',
                'Whiteboard Animation',
                'Intro & Outro Videos',
                'Subtitles & Captions',
                'Visual Effects (VFX)',
                'Green Screen Editing',
                'Product Videos',
                'Slideshow Videos',
                'Video Ads',
            ],
            'Music & Audio' => [
                'Music Production',
                'Mixing & Mastering',
                'Songwriting',
                'Vocal Recording',
                'Voice-Over',
                'Podcast Production',
                'Sound Design',
                'Audio Editing',
                'Jingles & Intros',
                'Background Music',
                'DJ Services',
                'Singing & Vocals',
                'Instrument Lessons',
                'Transcription',
                'Audiobook Production',
            ],
            'Business' => [
                'Virtual Assistance',
                'Data Entry',
                'Project Management',
                'Business Consulting',
                'Business Plans',
                'Market Research',
                'Customer Service',
                'E-commerce Management',
                'CRM Management',
                'Human Resources',
                'Presentation & Reports',
                'Lead Generation',
                'Supply Chain & Operations',
                'Financial Planning Support',
                'Business Documentation',
            ],
            'Lifestyle' => [
                'Fitness & Training',
                'Nutrition & Meal Planning',
                'Personal Development',
                'Life Coaching',
                'Career Coaching',
                'Fashion & Styling',
                'Beauty & Personal Care',
                'Cooking & Recipes',
                'Travel Planning',
                'Hobby Coaching',
                'Relationship Coaching',
                'Meditation & Relaxation',
                'Home Organization',
                'Parenting Guidance',
                'Pet Services',
            ],
            'Data & Analytics' => [
                'Data Analysis',
                'Data Visualization',
                'Business Intelligence',
                'Dashboard Development',
                'Excel & Spreadsheet Services',
                'SQL & Database Analysis',
                'Statistical Analysis',
                'Data Cleaning',
                'Data Collection',
                'Web Scraping',
                'Survey Analysis',
                'Forecasting',
                'Machine Learning & Predictive Analytics',
                'Reporting & KPI Tracking',
                'Data Engineering',
            ],
            'Engineering & Architecture' => [
                'Architectural Design',
                'Interior Design',
                'Landscape Design',
                '2D Drafting',
                '3D Modeling',
                '3D Architectural Rendering',
                'Structural Engineering',
                'Civil Engineering',
                'Mechanical Engineering',
                'Electrical Engineering',
                'MEP Design',
                'BIM Services',
                'CAD Design',
                'Product & Industrial Design',
                'Engineering Analysis',
            ],
            'AI Services' => [
                'AI Chatbots',
                'AI Agent Development',
                'AI Workflow Automation',
                'Generative AI Applications',
                'Custom GPTs & Assistants',
                'AI Integration',
                'AI Image Generation',
                'AI Video & Audio',
                'Prompt Engineering',
                'Retrieval-Augmented Generation (RAG)',
                'Model Fine-Tuning',
                'AI Data Preparation',
                'AI Content Workflows',
                'AI Testing & Evaluation',
                'AI Consulting',
            ],
            'Photography' => [
                'Portrait Photography',
                'Product Photography',
                'Event Photography',
                'Fashion Photography',
                'Food Photography',
                'Real Estate Photography',
                'Commercial Photography',
                'Landscape Photography',
                'Photo Editing',
                'Photo Retouching',
                'Background Removal',
                'Photo Restoration',
                'Photo Manipulation',
                'E-commerce Image Editing',
                'Photography Consultation',
            ],
            'Writing & Translation' => [
                'Website Content',
                'Blog & Article Writing',
                'Copywriting',
                'SEO Writing',
                'Technical Writing',
                'Creative Writing',
                'Editing & Proofreading',
                'Book & eBook Writing',
                'Resume & Cover Letters',
                'Business Writing',
                'Translation',
                'Transcription',
                'Localization',
                'Product Descriptions',
                'Speech & Script Writing',
                'Academic Editing',
            ],
        ];
    }

    public function run(): void
    {
        $categoryPosition = 0;

        foreach ($this->categories() as $name => $subcategories) {
            $category = ServiceCategory::query()->updateOrCreate(
                ['slug' => Str::slug($name)],
                [
                    'name' => $name,
                    'description' => null,
                    'featured' => in_array($name, [
                        'Graphics & Design',
                        'Digital Marketing',
                        'Programming & Tech',
                        'AI Services',
                    ], true),
                    'add_to_menu' => $categoryPosition < 4,
                    'status' => 'active',
                    'position' => $categoryPosition,
                ],
            );

            foreach ($subcategories as $subcategoryPosition => $subcategoryName) {
                ServiceSubcategory::query()->updateOrCreate(
                    [
                        'service_category_id' => $category->id,
                        'slug' => Str::slug($subcategoryName),
                    ],
                    [
                        'name' => $subcategoryName,
                        'description' => null,
                        'featured' => false,
                        'add_to_menu' => false,
                        'status' => 'active',
                        'position' => $subcategoryPosition,
                    ],
                );
            }

            $categoryPosition++;
        }
    }
}
