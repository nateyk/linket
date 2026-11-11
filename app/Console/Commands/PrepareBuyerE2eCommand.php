<?php

namespace App\Console\Commands;

use App\Courses\Models\Chapter;
use App\Courses\Models\Course;
use App\Courses\Models\Lesson;
use App\Payments\VerifyEt\VerifyEtSettings;
use App\Models\User;
use Common\Permissions\Models\Permission;
use Common\Roles\Models\Role;
use App\Storefront\Models\CreatorPaymentMethod;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DirectPaymentMethod;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Services\CreatorVerificationAllowance;
use App\Stores\Models\Store;
use Common\Billing\Models\Product;
use Common\Files\FileEntry;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class PrepareBuyerE2eCommand extends Command
{
    protected $signature = 'linket:prepare-buyer-e2e {--write=storage/app/e2e/buyer-fixture.json} {--with-reviewer : Seed an isolated moderation test reviewer}';

    protected $description = 'Upsert synthetic buyer-journey fixtures into the isolated test database for Playwright';

    public function handle(): int
    {
        $database = (string) DB::connection()->getDatabaseName();
        if (! app()->environment('testing') || ! str_contains(strtolower($database), 'test')) {
            $this->error("Refusing to seed: APP_ENV must be testing and DB must be disposable (got env=".app()->environment().", db={$database}).");

            return self::FAILURE;
        }

        if (! config('services.verify_et.mock') || ! VerifyEtSettings::get('enabled')) {
            $this->error('Refusing to seed: VERIFY_ET_ENABLED and VERIFY_ET_MOCK must be true for isolated buyer E2E.');

            return self::FAILURE;
        }

        $withReviewer = (bool) $this->option('with-reviewer');
        $reviewerPassword = null;
        if ($withReviewer) {
            $appHost = strtolower((string) parse_url((string) config('app.url'), PHP_URL_HOST));
            $reviewerPassword = getenv('LINKET_E2E_REVIEWER_PASSWORD');
            if (
                getenv('LINKET_ISOLATED_E2E') !== '1'
                || $database !== 'belink_test'
                || ! in_array($appHost, ['127.0.0.1', 'localhost'], true)
                || ! is_string($reviewerPassword)
                || strlen($reviewerPassword) < 24
            ) {
                $this->error('Refusing moderation fixture: explicit isolated E2E, loopback app URL, disposable database and temporary reviewer credential required.');

                return self::FAILURE;
            }

            // Change moderation defaults only when that scenario is requested.
            settings()->save([
                'product.adding_requires_review' => 1,
                'product.updating_requires_review' => 1,
            ]);
        }

        // Isolated E2E reuses one client IP; clear stale API throttles between runs.
        RateLimiter::clear('illuminate:throttle');
        $this->call('db:seed', [
            '--class' => \Database\Seeders\SupportDefaultsSeeder::class,
            '--force' => true,
            '--no-interaction' => true,
        ]);
        $this->call('db:seed', [
            '--class' => \Common\Database\Seeders\RolesTableSeeder::class,
            '--force' => true,
            '--no-interaction' => true,
        ]);

        $fixture = DB::transaction(function () use ($withReviewer, $reviewerPassword): array {
            DirectPaymentMethod::query()->updateOrCreate(
                ['code' => 'cbe'],
                [
                    'checkout_enabled' => true,
                    'automated_verification_supported' => true,
                    'recipient_matching_supported' => true,
                    'operationally_suspended' => false,
                    'creator_setup_enabled' => true,
                ],
            );

            $creator = User::query()->where('email', 'e2e-buyer-creator@example.test')->first();
            if (! $creator) {
                $creator = User::query()->create([
                    'name' => 'E2E Buyer Creator',
                    'username' => 'e2e-buyer-creator-'.Str::lower(Str::random(6)),
                    'email' => 'e2e-buyer-creator@example.test',
                    'password' => Hash::make('E2eBuyerCreator!23'),
                    'email_verified_at' => now(),
                ]);
            } else {
                $creator->forceFill([
                    'password' => Hash::make('E2eBuyerCreator!23'),
                    'email_verified_at' => now(),
                ])->save();
            }

            if ($withReviewer) {
                // The caller already verified the disposable DB, loopback URL
                // and reviewer-only opt-in before any seeded mutations.
                $this->ensureDisposableCreatorUploadRole($creator);
            }

            $workspace = DB::table('workspace_user')
                ->where('user_id', $creator->id)
                ->first();
            if ($workspace) {
                $workspaceId = (int) $workspace->workspace_id;
            } else {
                $workspaceId = (new CreateWorkspace())->createPersonalWorkspace($creator)->id;
            }

            $store = Store::query()->where('back_half', 'e2e-buyer-store')->first();
            if (! $store) {
                $store = Store::query()->create([
                    'name' => 'E2E Buyer Store',
                    'back_half' => 'e2e-buyer-store',
                    'user_id' => $creator->id,
                    'workspace_id' => $workspaceId,
                ]);
            } else {
                $store->update([
                    'name' => 'E2E Buyer Store',
                    'user_id' => $creator->id,
                    'workspace_id' => $workspaceId,
                    'deleted_at' => null,
                ]);
            }

            $product = DigitalProduct::query()
                ->where('user_id', $creator->id)
                ->where('title', 'E2E Buyer Digital Guide')
                ->first();
            if (! $product) {
                $product = DigitalProduct::query()->create([
                    'workspace_id' => $workspaceId,
                    'user_id' => $creator->id,
                    'title' => 'E2E Buyer Digital Guide',
                    'description' => 'Synthetic product for isolated buyer E2E.',
                    'price_cents' => 10000,
                    'currency' => 'ETB',
                    'status' => 'approved',
                    'approved_at' => now(),
                    'type' => 'digital',
                ]);
            } else {
                $product->update([
                    'workspace_id' => $workspaceId,
                    'description' => 'Synthetic product for isolated buyer E2E.',
                    'price_cents' => 10000,
                    'currency' => 'ETB',
                    'status' => 'approved',
                    'approved_at' => now(),
                    'type' => 'digital',
                ]);
            }
            $product->stores()->syncWithoutDetaching([$store->id]);
            $courseProductId = $this->seedCourseResumeFixture($creator, $workspaceId);

            $fileContent = "%PDF-1.4\nE2E buyer delivery\n";
            $file = $product->files()->first();
            if (! $file) {
                $file = FileEntry::query()->create([
                    'name' => 'e2e-guide.pdf',
                    'file_name' => 'e2e-'.Str::random(16).'.pdf',
                    'mime' => 'application/pdf',
                    'extension' => 'pdf',
                    'type' => 'file',
                    'file_size' => strlen($fileContent),
                    'workspace_id' => $workspaceId,
                    'owner_id' => $creator->id,
                ]);
                $product->files()->attach($file->id);
            }
            $file->getDisk()->put($file->getStoragePath(), $fileContent);

            $reviewProductId = null;
            $reviewProductIds = [];
            if ($withReviewer) {
                // Real authenticated moderation test fixture. This never runs outside
                // APP_ENV=testing and a database name containing "test" (guard above).
                $reviewer = User::query()->firstOrCreate(
                    ['email' => 'e2e-product-reviewer@example.test'],
                    [
                        'name' => 'E2E Product Reviewer',
                        'username' => 'e2e-product-reviewer-'.Str::lower(Str::random(6)),
                        'password' => Hash::make($reviewerPassword),
                        'email_verified_at' => now(),
                    ],
                );
                $reviewer->forceFill([
                    'password' => Hash::make($reviewerPassword),
                    'email_verified_at' => now(),
                ])->save();
                $reviewer->permissions()->syncWithoutDetaching([
                    Permission::query()->firstOrCreate(['name' => 'admin'])->id,
                ]);

                $reviewFixtureDescription = 'Synthetic private moderation lifecycle fixture';
                $reviewProduct = DigitalProduct::query()
                    ->where('user_id', $creator->id)
                    ->where('description', $reviewFixtureDescription)
                    ->first() ?? new DigitalProduct();
                $reviewProduct->forceFill([
                    'workspace_id' => $workspaceId,
                    'user_id' => $creator->id,
                    'title' => 'E2E Moderation Lifecycle Guide',
                    'description' => $reviewFixtureDescription,
                    'price_cents' => 0,
                    'currency' => 'ETB',
                    'status' => 'pending_approval',
                    'approved_at' => null,
                    'review_requested_by' => $creator->id,
                    'review_requested_at' => now(),
                    'rejection_reason' => null,
                    'pending_review_snapshot' => null,
                    'type' => 'digital',
                ])->save();
                $reviewProduct->files()->syncWithoutDetaching([$file->id]);
                $reviewProductId = (int) $reviewProduct->id;
                $reviewProductIds['digital'] = $reviewProductId;

                $reviewProductIds = array_merge(
                    $reviewProductIds,
                    $this->seedAdditionalReviewProducts($creator, $workspaceId, $file),
                );
            }

            $method = CreatorPaymentMethod::query()
                ->where('workspace_id', $workspaceId)
                ->where('user_id', $creator->id)
                ->where('provider', 'cbe')
                ->first();
            if (! $method) {
                CreatorPaymentMethod::query()->create([
                    'workspace_id' => $workspaceId,
                    'user_id' => $creator->id,
                    'provider' => 'cbe',
                    'account_number' => '1000123456789',
                    'account_fingerprint' => hash('sha256', 'e2e-cbe-'.$creator->id),
                    'account_name_raw' => 'E2E Buyer Creator',
                    'account_name_normalized' => 'e2e buyer creator',
                    'status' => 'approved',
                    'provider_registration_status' => 'registered',
                    'is_active' => true,
                    'is_suspended' => false,
                ]);
            } else {
                $method->forceFill([
                    'account_number' => '1000123456789',
                    'account_fingerprint' => hash('sha256', 'e2e-cbe-'.$creator->id),
                    'account_name_raw' => 'E2E Buyer Creator',
                    'account_name_normalized' => 'e2e buyer creator',
                    'status' => 'approved',
                    'provider_registration_status' => 'registered',
                    'is_active' => true,
                    'is_suspended' => false,
                ])->save();
            }

            // Free-plan verified-sale slots fill up across Playwright reruns; reset for isolation.
            DB::table('storefront_orders')
                ->where('creator_id', $creator->id)
                ->whereIn('status', ['pending_payment', 'verifying', 'manual_review', 'failed_verification'])
                ->update(['status' => 'expired', 'updated_at' => now()]);
            DB::table('creator_verification_allowances')
                ->where('creator_id', $creator->id)
                ->delete();

            return [
                'database' => DB::connection()->getDatabaseName(),
                'store_slug' => $store->back_half,
                'product_id' => $product->id,
                'product_url' => '/'.$store->back_half.'/products/'.$product->id,
                'product_title' => $product->title,
                'course_product_id' => $courseProductId,
                'review_product_id' => $reviewProductId,
                'review_product_ids' => $reviewProductIds,
                'buyer_email' => 'e2e-buyer-'.Str::lower(Str::random(8)).'@example.test',
                'buyer_name' => 'E2E Buyer',
                'verify_mock' => true,
                'account_number' => '1000123456789',
                'platform' => $this->platformFixture(),
                'allowance' => $this->allowanceFixture(),
            ];
        });

        $absolute = base_path((string) $this->option('write'));
        if (! is_dir(dirname($absolute))) {
            mkdir(dirname($absolute), 0775, true);
        }
        file_put_contents($absolute, json_encode($fixture, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)."\n");
        $platformPath = base_path('storage/app/e2e/platform-fixture.json');
        file_put_contents($platformPath, json_encode($fixture['platform'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)."\n");
        file_put_contents(
            base_path('storage/app/e2e/allowance-fixture.json'),
            json_encode($fixture['allowance'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)."\n",
        );

        $this->info('Buyer E2E fixtures ready on '.$fixture['database']);
        $this->line($absolute);

        return self::SUCCESS;
    }

    /**
     * Match the standard creator role after query-based E2E seeding. Never
     * grant elevated file permission or change production role policies.
     * Called exclusively from the guarded --with-reviewer path.
     */
    private function ensureDisposableCreatorUploadRole(User $creator): void
    {
        $usersRole = Role::query()
            ->where('name', 'Users')
            ->where('type', 'users')
            ->firstOrFail();
        $creator->roles()->syncWithoutDetaching([$usersRole->id]);
        $creator->unsetRelation('roles');
        if (! $creator->hasPermission('files.create')) {
            throw new \RuntimeException(
                'The disposable creator lacks standard Users files.create permission.',
            );
        }
    }

    /**
     * Provision additional product types only after the caller's fail-closed
     * reviewer guard has verified belink_test and a loopback app origin.
     *
     * @return array<string, int>
     */
    private function seedAdditionalReviewProducts(User $creator, int $workspaceId, FileEntry $file): array
    {
        $ids = [];
        // Four independent real moderation fixtures, strictly guarded by
        // --with-reviewer and the loopback disposable belink_test check.
        // Audio needs its own MP3 metadata, not the PDF buyer fixture.
        $audioContent = "ID3\x04\x00\x00\x00\x00\x00\x00";
        $audioFile = FileEntry::query()
            ->where('workspace_id', $workspaceId)
            ->where('owner_id', $creator->id)
            ->where('name', 'e2e-moderation.mp3')
            ->first();
        if (! $audioFile) {
            $audioFile = FileEntry::query()->create([
                'name' => 'e2e-moderation.mp3',
                'file_name' => 'e2e-'.Str::random(16).'.mp3',
                'mime' => 'audio/mpeg',
                'extension' => 'mp3',
                'type' => 'file',
                'file_size' => strlen($audioContent),
                'workspace_id' => $workspaceId,
                'owner_id' => $creator->id,
            ]);
        }
        $audioFile->getDisk()->put($audioFile->getStoragePath(), $audioContent);

        foreach ([
            'ebook' => 'E2E Moderation E-book',
            'audio' => 'E2E Moderation Audio',
            'course' => 'E2E Moderation Course',
        ] as $reviewType => $title) {
            $description = 'Synthetic private '.$reviewType.' moderation lifecycle fixture';
            $typeProduct = DigitalProduct::query()
                ->where('user_id', $creator->id)
                ->where('description', $description)
                ->first() ?? new DigitalProduct();
            $typeProduct->forceFill([
                'workspace_id' => $workspaceId,
                'user_id' => $creator->id,
                'title' => $title,
                'description' => $description,
                'price_cents' => 0,
                'currency' => 'ETB',
                'status' => 'pending_approval',
                'approved_at' => null,
                'review_requested_by' => $creator->id,
                'review_requested_at' => now(),
                'rejection_reason' => null,
                'pending_review_snapshot' => null,
                'type' => $reviewType,
            ])->save();

            if ($reviewType === 'course') {
                $reviewCourse = Course::query()->firstOrCreate(
                    ['digital_product_id' => $typeProduct->id],
                    ['instructor_user_id' => $creator->id],
                );
                $chapter = Chapter::query()->firstOrCreate(
                    ['course_id' => $reviewCourse->id, 'title' => 'E2E Review Chapter'],
                    ['sort_order' => 0],
                );
                $lesson = Lesson::query()->firstOrCreate(
                    [
                        'course_id' => $reviewCourse->id,
                        'chapter_id' => $chapter->id,
                        'title' => 'E2E Published Review Lesson',
                    ],
                    ['content_type' => 'readable', 'status' => 'published', 'sort_order' => 0],
                );
                $lesson->forceFill(['status' => 'published'])->save();
            } else {
                $typeProduct->files()->sync([
                    $reviewType === 'audio' ? $audioFile->id : $file->id,
                ]);
            }
            $ids[$reviewType] = (int) $typeProduct->id;
        }

        return $ids;
    }

    /**
     * Prepare an editable Course lesson in the already-guarded disposable test DB.
     * The browser route expects the product ID, not the course record ID.
     */
    private function seedCourseResumeFixture(User $creator, int $workspaceId): int
    {
        $product = DigitalProduct::query()->firstOrCreate(
            ['user_id' => $creator->id, 'title' => 'E2E Mobile Lesson Resume'],
            [
                'workspace_id' => $workspaceId,
                'description' => 'Synthetic draft for isolated Course browser QA.',
                'price_cents' => 0,
                'currency' => 'ETB',
                'status' => 'draft',
                'type' => 'course',
            ],
        );
        $product->forceFill([
            'workspace_id' => $workspaceId,
            'status' => 'draft',
            'type' => 'course',
        ])->save();

        $course = Course::query()->firstOrCreate(
            ['digital_product_id' => $product->id],
            ['instructor_user_id' => $creator->id],
        );
        $chapter = Chapter::query()->firstOrCreate(
            ['course_id' => $course->id, 'title' => 'E2E Chapter'],
            ['sort_order' => 0],
        );
        Lesson::query()->firstOrCreate(
            [
                'course_id' => $course->id,
                'chapter_id' => $chapter->id,
                'title' => 'E2E Resume Lesson',
            ],
            ['content_type' => 'readable', 'status' => 'draft', 'sort_order' => 0],
        );

        return (int) $product->id;
    }

    /** @return array<string, mixed> */
    private function platformFixture(): array
    {
        $catalog = DirectPaymentMethod::query()->where('code', 'telebirr')->first();
        if (! $catalog) {
            throw new \RuntimeException('Telebirr is missing from the payment catalog on the isolated test database.');
        }
        $catalog->forceFill([
            'checkout_enabled' => true,
            'automated_verification_supported' => true,
            'recipient_matching_supported' => true,
            'operationally_suspended' => false,
            'creator_setup_enabled' => true,
        ])->save();

        $creator = User::query()->where('email', 'mintesnot.teshome.e2e@example.test')->first();
        if (! $creator) {
            $creator = User::query()->create([
                'name' => 'Mintesnot Teshome',
                'username' => 'mintesnot-teshome-e2e',
                'email' => 'mintesnot.teshome.e2e@example.test',
                'password' => Hash::make('JourneyPassword123!'),
                'email_verified_at' => now(),
            ]);
        } else {
            $creator->forceFill([
                'name' => 'Mintesnot Teshome',
                'password' => Hash::make('JourneyPassword123!'),
                'email_verified_at' => now(),
            ])->save();
        }

        $workspace = DB::table('workspace_user')->where('user_id', $creator->id)->first();
        $workspaceId = $workspace
            ? (int) $workspace->workspace_id
            : (new CreateWorkspace())->createPersonalWorkspace($creator)->id;

        $store = Store::query()->where('back_half', 'mintesnot-e2e-store')->first();
        if (! $store) {
            $store = Store::query()->create([
                'name' => 'Mintesnot Teshome',
                'back_half' => 'mintesnot-e2e-store',
                'user_id' => $creator->id,
                'workspace_id' => $workspaceId,
            ]);
        } else {
            $store->update([
                'name' => 'Mintesnot Teshome',
                'user_id' => $creator->id,
                'workspace_id' => $workspaceId,
                'deleted_at' => null,
            ]);
        }
        $store->forceFill(['profile_config' => ['display_name' => 'Mintesnot Teshome']])->save();

        $product = DigitalProduct::query()
            ->where('user_id', $creator->id)
            ->where('title', 'Mintesnot field guide')
            ->first();
        if (! $product) {
            $product = DigitalProduct::query()->create([
                'workspace_id' => $workspaceId,
                'user_id' => $creator->id,
                'title' => 'Mintesnot field guide',
                'description' => 'Synthetic ETB 2470 guide for the isolated browser journey.',
                'price_cents' => 247000,
                'currency' => 'ETB',
                'status' => 'approved',
                'approved_at' => now(),
                'type' => 'digital',
            ]);
        } else {
            $product->update([
                'workspace_id' => $workspaceId,
                'price_cents' => 247000,
                'currency' => 'ETB',
                'status' => 'approved',
                'approved_at' => now(),
                'type' => 'digital',
            ]);
        }
        $product->stores()->syncWithoutDetaching([$store->id]);

        $fileContent = "%PDF-1.4\nlinket-platform-journey-2470\n";
        $file = $product->files()->first();
        if (! $file) {
            $file = FileEntry::query()->create([
                'name' => 'field-guide.pdf',
                'file_name' => 'platform-'.Str::random(16).'.pdf',
                'mime' => 'application/pdf',
                'extension' => 'pdf',
                'type' => 'file',
                'file_size' => strlen($fileContent),
                'workspace_id' => $workspaceId,
                'owner_id' => $creator->id,
            ]);
            $product->files()->attach($file->id);
        }
        $file->getDisk()->put($file->getStoragePath(), $fileContent);

        $method = CreatorPaymentMethod::query()
            ->where('workspace_id', $workspaceId)
            ->where('user_id', $creator->id)
            ->where('provider', 'telebirr')
            ->first();
        $attributes = [
            'account_number' => '0911002470',
            'account_fingerprint' => hash('sha256', 'e2e-telebirr-'.$creator->id),
            'account_name_raw' => 'Mintesnot Teshome',
            'account_name_normalized' => 'mintesnot teshome',
            'status' => 'approved',
            'provider_registration_status' => 'registered',
            'is_active' => true,
            'is_suspended' => false,
        ];
        if (! $method) {
            CreatorPaymentMethod::query()->create([
                'workspace_id' => $workspaceId,
                'user_id' => $creator->id,
                'provider' => 'telebirr',
                ...$attributes,
            ]);
        } else {
            $method->forceFill($attributes)->save();
        }

        DB::table('storefront_orders')
            ->where('creator_id', $creator->id)
            ->whereIn('status', ['pending_payment', 'verifying', 'manual_review', 'failed_verification'])
            ->update(['status' => 'expired', 'updated_at' => now()]);
        DB::table('creator_verification_allowances')->where('creator_id', $creator->id)->delete();

        return [
            'database' => DB::connection()->getDatabaseName(),
            'store_slug' => $store->back_half,
            'product_id' => $product->id,
            'product_url' => '/'.$store->back_half.'/products/'.$product->id,
            'product_title' => $product->title,
            'buyer_name' => 'Nathnael',
            'account_number' => '0911002470',
            'price_label' => '2,470.00',
            'file_marker' => 'linket-platform-journey-2470',
        ];
    }

    /** @return array<string, mixed> */
    private function allowanceFixture(): array
    {
        $free = Product::query()->where('system_key', 'free')->first()
            ?? Product::query()->where('free', true)->orderByDesc('is_default')->first();
        if ($free) {
            $benefits = is_array($free->storefront_benefits) ? $free->storefront_benefits : [];
            $free->update(['storefront_benefits' => [...$benefits, 'free_verified_sales' => 10]]);
        }

        $creator = User::query()->where('email', 'allowance-limit@example.test')->first();
        if (! $creator) {
            $creator = User::query()->create([
                'name' => 'Allowance Limit',
                'username' => 'allowance-limit',
                'email' => 'allowance-limit@example.test',
                'password' => Hash::make('JourneyPassword123!'),
                'email_verified_at' => now(),
            ]);
        } else {
            $creator->forceFill([
                'password' => Hash::make('JourneyPassword123!'),
                'email_verified_at' => now(),
            ])->save();
        }

        $workspace = DB::table('workspace_user')->where('user_id', $creator->id)->first();
        $workspaceId = $workspace
            ? (int) $workspace->workspace_id
            : (new CreateWorkspace())->createPersonalWorkspace($creator)->id;

        $store = Store::query()->where('back_half', 'allowance-limit-store')->first();
        if (! $store) {
            $store = Store::query()->create([
                'name' => 'Allowance Limit',
                'back_half' => 'allowance-limit-store',
                'user_id' => $creator->id,
                'workspace_id' => $workspaceId,
            ]);
        } else {
            $store->update([
                'user_id' => $creator->id,
                'workspace_id' => $workspaceId,
                'deleted_at' => null,
            ]);
        }

        $product = DigitalProduct::query()
            ->where('user_id', $creator->id)
            ->where('title', 'Allowance limit guide')
            ->first();
        if (! $product) {
            $product = DigitalProduct::query()->create([
                'workspace_id' => $workspaceId,
                'user_id' => $creator->id,
                'title' => 'Allowance limit guide',
                'description' => 'Synthetic product with ten consumed free verified sales.',
                'price_cents' => 10000,
                'currency' => 'ETB',
                'status' => 'approved',
                'approved_at' => now(),
                'type' => 'digital',
            ]);
        } else {
            $product->update([
                'workspace_id' => $workspaceId,
                'status' => 'approved',
                'approved_at' => now(),
                'price_cents' => 10000,
                'currency' => 'ETB',
            ]);
        }
        $product->stores()->syncWithoutDetaching([$store->id]);
        $fileContent = "%PDF-1.4\nallowance-limit-guide\n";
        $file = $product->files()->first();
        if (! $file) {
            $file = FileEntry::query()->create([
                'name' => 'allowance-limit.pdf',
                'file_name' => 'allowance-limit-'.Str::random(8).'.pdf',
                'mime' => 'application/pdf',
                'extension' => 'pdf',
                'type' => 'file',
                'file_size' => strlen($fileContent),
                'workspace_id' => $workspaceId,
                'owner_id' => $creator->id,
            ]);
            $product->files()->attach($file->id);
        }
        $file->getDisk()->put($file->getStoragePath(), $fileContent);

        $method = CreatorPaymentMethod::query()
            ->where('workspace_id', $workspaceId)
            ->where('user_id', $creator->id)
            ->where('provider', 'telebirr')
            ->first();
        $methodAttributes = [
            'account_number' => '0911002490',
            'account_fingerprint' => hash('sha256', 'allowance-limit-telebirr-'.$creator->id),
            'account_name_raw' => 'Allowance Limit',
            'account_name_normalized' => 'allowance limit',
            'status' => 'approved',
            'provider_registration_status' => 'registered',
            'is_active' => true,
            'is_suspended' => false,
        ];
        if (! $method) {
            $method = CreatorPaymentMethod::query()->create([
                'workspace_id' => $workspaceId,
                'user_id' => $creator->id,
                'provider' => 'telebirr',
                ...$methodAttributes,
            ]);
        } else {
            $method->forceFill($methodAttributes)->save();
        }

        $consumed = DB::table('creator_verification_allowances')
            ->where('creator_id', $creator->id)
            ->where('status', 'consumed')
            ->count();
        if ($consumed !== 10) {
            DB::table('creator_verification_allowances')->where('creator_id', $creator->id)->delete();
            StorefrontOrder::query()
                ->where('creator_id', $creator->id)
                ->where('payment_reference', 'like', 'ALLOWLIM%')
                ->delete();
            foreach (range(1, 10) as $sale) {
                $order = StorefrontOrder::query()->create([
                    'uuid' => (string) Str::uuid(),
                    'digital_product_id' => $product->id,
                    'biolink_id' => $store->id,
                    'creator_id' => $creator->id,
                    'buyer_name' => 'Nathnael',
                    'buyer_email' => "allowance-sale-{$sale}@example.test",
                    'currency' => 'ETB',
                    'gross_amount_cents' => 10000,
                    'commission_bps' => 0,
                    'platform_fee_cents' => 0,
                    'creator_earnings_cents' => 10000,
                    'status' => 'paid',
                    'payment_gateway' => 'verify_et',
                    'paid_at' => now(),
                    'creator_payment_method_id' => $method->id,
                    'payment_reference' => 'ALLOWLIM'.str_pad((string) $sale, 4, '0', STR_PAD_LEFT),
                    'monetization_policy' => CreatorVerificationAllowance::FREE_POLICY,
                ]);
                DB::table('creator_verification_allowances')->insert([
                    'creator_id' => $creator->id,
                    'storefront_order_id' => $order->id,
                    'status' => 'consumed',
                    'consumed_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        return [
            'database' => DB::connection()->getDatabaseName(),
            'email' => 'allowance-limit@example.test',
            'product_url' => '/'.$store->back_half.'/products/'.$product->id,
            'biolink_id' => $store->id,
            'product_id' => $product->id,
            'payment_method_id' => $method->id,
            'consumed' => 10,
            'upgrade_message' => 'Your free verified-sales allowance is used or reserved. Upgrade to Pro to accept more sales.',
            'checkout_block_message' => 'All free verified-sale allowances are used or reserved. Upgrade to Pro to continue.',
            'buyer_block_message' => 'Creator cannot accept additional verified sales right now',
        ];
    }
}
