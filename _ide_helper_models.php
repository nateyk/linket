<?php

// @formatter:off
// phpcs:ignoreFile
/**
 * A helper file for your Eloquent Models
 * Copy the phpDocs from this file to the correct Model,
 * And remove them from this file, to prevent double declarations.
 *
 * @author Barry vd. Heuvel <barryvdh@gmail.com>
 */


namespace App\Analytics\Models{
/**
 * @property int $id
 * @property int $linkeable_id
 * @property string|null $platform
 * @property string|null $device
 * @property string|null $browser
 * @property string|null $location
 * @property int $crawler
 * @property string|null $referrer
 * @property string|null $ip
 * @property string $event_type
 * @property int|null $workspace_id
 * @property int $domain_id
 * @property \Illuminate\Support\Carbon $created_at
 * @property string|null $city
 * @property string|null $state
 * @property string $linkeable_type
 * @property int|null $user_id
 * @property-read \Illuminate\Database\Eloquent\Model|\Eloquent $linkeable
 * @method static \App\Analytics\Factories\TrackedEventFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackedEvent newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackedEvent newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackedEvent query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackedEvent whereBrowser($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackedEvent whereCity($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackedEvent whereCrawler($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackedEvent whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackedEvent whereDevice($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackedEvent whereDomainId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackedEvent whereEventType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackedEvent whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackedEvent whereIp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackedEvent whereLinkeableId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackedEvent whereLinkeableType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackedEvent whereLocation($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackedEvent wherePlatform($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackedEvent whereReferrer($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackedEvent whereState($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackedEvent whereUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackedEvent whereWorkspaceId($value)
 */
	class TrackedEvent extends \Eloquent {}
}

namespace App\Biolinks\Models{
/**
 * @property int $id
 * @property string $name
 * @property string $back_half
 * @property int $user_id
 * @property int $workspace_id
 * @property string $builder_mode
 * @property array<array-key, mixed>|null $profile_config
 * @property int|null $domain_id
 * @property string|null $password
 * @property int $clicks_count
 * @property string|null $utm
 * @property \Illuminate\Support\Carbon|null $expires_at
 * @property \Illuminate\Support\Carbon|null $activates_at
 * @property \Illuminate\Support\Carbon|null $clicked_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Biolinks\Models\BiolinkAppearance|null $appearance
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Storefront\Models\DigitalProduct> $digitalProducts
 * @property-read int|null $digital_products_count
 * @property-read \Common\Domains\CustomDomain|null $domain
 * @property-read string $model_type
 * @property-read mixed $short_url
 * @property-read \App\Biolinks\Models\BiolinkPivot|null $pivot
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Biolinks\Models\BiolinkLink> $links
 * @property-read int|null $links_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\TrackingPixels\Models\TrackingPixel> $pixels
 * @property-read int|null $pixels_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Links\Models\LinkeableRule> $rules
 * @property-read int|null $rules_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Tags\Models\Tag> $tags
 * @property-read int|null $tags_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Analytics\Models\TrackedEvent> $trackedEvents
 * @property-read int|null $tracked_events_count
 * @property-read \App\Models\User|null $user
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Biolinks\Models\BiolinkWidget> $widgets
 * @property-read int|null $widgets_count
 * @method static \App\Biolinks\Factories\BiolinkFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink forCurrentDomain()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink matches(array $columns, string $value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink mysqlSearch(string $query)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink whereActivatesAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink whereBackHalf($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink whereBelongsToActiveWorkspace()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink whereBuilderMode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink whereClickedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink whereClicksCount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink whereDomainId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink whereExpiresAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink wherePassword($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink whereProfileConfig($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink whereUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink whereUtm($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink whereWorkspaceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Biolink withoutTrashed()
 */
	class Biolink extends \Eloquent {}
}

namespace App\Biolinks\Models{
/**
 * @property int $id
 * @property int $biolink_id
 * @property string $config
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkAppearance newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkAppearance newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkAppearance query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkAppearance whereBiolinkId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkAppearance whereConfig($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkAppearance whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkAppearance whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkAppearance whereUpdatedAt($value)
 */
	class BiolinkAppearance extends \Eloquent {}
}

namespace App\Biolinks\Models{
/**
 * @property int $id
 * @property string|null $name
 * @property string $back_half
 * @property string $long_url
 * @property int $user_id
 * @property int|null $domain_id
 * @property string|null $password
 * @property \Illuminate\Support\Carbon|null $expires_at
 * @property string|null $description
 * @property string $type
 * @property int|null $type_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property int|null $workspace_id
 * @property int|null $folder_id
 * @property string|null $image
 * @property \Illuminate\Support\Carbon|null $clicked_at
 * @property int $clicks_count
 * @property \Illuminate\Support\Carbon|null $activates_at
 * @property string|null $utm
 * @property-read mixed $active
 * @property-read bool $active_locked
 * @property-read mixed $animation
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Biolinks\Models\Biolink> $biolinks
 * @property-read int|null $biolinks_count
 * @property-read \Common\Domains\CustomDomain|null $domain
 * @property-read \App\Folders\Models\Folder|null $folder
 * @property-read string $model_type
 * @property-read mixed $short_url
 * @property-read mixed $leap_until
 * @property-read \App\LinkPages\Models\LinkPage|null $linkPage
 * @property-read \App\LinkOverlays\Models\LinkOverlay|null $overlay
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\TrackingPixels\Models\TrackingPixel> $pixels
 * @property-read int|null $pixels_count
 * @property-read mixed $position
 * @property-read \App\QrCodes\Models\QrCode|null $qrCode
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Links\Models\LinkeableRule> $rules
 * @property-read int|null $rules_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Tags\Models\Tag> $tags
 * @property-read int|null $tags_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Analytics\Models\TrackedEvent> $trackedEvents
 * @property-read int|null $tracked_events_count
 * @property-read \App\Models\User|null $user
 * @method static \App\Links\Factories\LinkFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink forCurrentDomain()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink matches(array $columns, string $value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink mysqlSearch(string $query)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink whereActivatesAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink whereBackHalf($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink whereBelongsToActiveWorkspace()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink whereClickedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink whereClicksCount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink whereDomainId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink whereExpiresAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink whereFolderId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink whereHash(string $backHalf)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink whereImage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink whereLongUrl($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink wherePassword($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink whereType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink whereTypeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink whereUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink whereUtm($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink whereWorkspaceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkLink withoutTrashed()
 */
	class BiolinkLink extends \Eloquent {}
}

namespace App\Biolinks\Models{
/**
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkPivot newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkPivot newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkPivot query()
 */
	class BiolinkPivot extends \Eloquent {}
}

namespace App\Biolinks\Models{
/**
 * @property int $id
 * @property int $biolink_id
 * @property string $type
 * @property bool $active
 * @property int $position
 * @property string $config
 * @property string|null $pinned
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read string $model_type
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkWidget newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkWidget newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkWidget query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkWidget whereActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkWidget whereBiolinkId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkWidget whereConfig($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkWidget whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkWidget whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkWidget wherePinned($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkWidget wherePosition($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkWidget whereType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BiolinkWidget whereUpdatedAt($value)
 */
	class BiolinkWidget extends \Eloquent {}
}

namespace App\Folders\Models{
/**
 * @property int $id
 * @property string $name
 * @property string $back_half
 * @property int $user_id
 * @property int $workspace_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $description
 * @property bool $rotator
 * @property int|null $domain_id
 * @property string|null $password
 * @property \Illuminate\Support\Carbon|null $expires_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property int $clicks_count
 * @property string|null $utm
 * @property \Illuminate\Support\Carbon|null $activates_at
 * @property string|null $image
 * @property-read \Common\Domains\CustomDomain|null $domain
 * @property-read mixed $has_password
 * @property-read string $model_type
 * @property-read mixed $short_url
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Analytics\Models\TrackedEvent> $linkClicks
 * @property-read int|null $link_clicks_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Links\Models\Link> $links
 * @property-read int|null $links_count
 * @property-read \App\QrCodes\Models\QrCode|null $qrCode
 * @property-read \App\Links\Models\Link|null $randomLink
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Links\Models\LinkeableRule> $rules
 * @property-read int|null $rules_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Tags\Models\Tag> $tags
 * @property-read int|null $tags_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Analytics\Models\TrackedEvent> $trackedEvents
 * @property-read int|null $tracked_events_count
 * @property-read \App\Models\User|null $user
 * @method static \App\Folders\Factories\FolderFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder forCurrentDomain()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder matches(array $columns, string $value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder mysqlSearch(string $query)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder whereActivatesAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder whereBackHalf($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder whereBelongsToActiveWorkspace()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder whereClicksCount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder whereDomainId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder whereExpiresAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder whereImage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder wherePassword($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder whereRotator($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder whereUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder whereUtm($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder whereWorkspaceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Folder withoutTrashed()
 */
	class Folder extends \Eloquent {}
}

namespace App\Kyc\Models{
/**
 * @property int $id
 * @property int $user_id
 * @property string $document_type
 * @property string $document_number
 * @property object $documents
 * @property string $status
 * @property string|null $rejection_reason
 * @property int|null $reviewed_by
 * @property \Illuminate\Support\Carbon|null $reviewed_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read string $model_type
 * @property-read \App\Models\User|null $reviewer
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KycVerification matches(array $columns, string $value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KycVerification mysqlSearch(string $query)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KycVerification newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KycVerification newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KycVerification query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KycVerification whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KycVerification whereDocumentNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KycVerification whereDocumentType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KycVerification whereDocuments($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KycVerification whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KycVerification whereRejectionReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KycVerification whereReviewedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KycVerification whereReviewedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KycVerification whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KycVerification whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KycVerification whereUserId($value)
 */
	class KycVerification extends \Eloquent {}
}

namespace App\LinkOverlays\Models{
/**
 * @property int $id
 * @property string $name
 * @property int $user_id
 * @property string $position
 * @property string $message
 * @property string|null $label
 * @property string|null $btn_link
 * @property string|null $btn_text
 * @property string $colors
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $workspace_id
 * @property string $theme
 * @property string|null $image
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read string $model_type
 * @property-read \App\Models\User|null $user
 * @method static \App\LinkOverlays\Factories\LinkOverlayFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkOverlay matches(array $columns, string $value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkOverlay mysqlSearch(string $query)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkOverlay newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkOverlay newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkOverlay onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkOverlay query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkOverlay whereBelongsToActiveWorkspace()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkOverlay whereBtnLink($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkOverlay whereBtnText($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkOverlay whereColors($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkOverlay whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkOverlay whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkOverlay whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkOverlay whereImage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkOverlay whereLabel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkOverlay whereMessage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkOverlay whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkOverlay wherePosition($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkOverlay whereTheme($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkOverlay whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkOverlay whereUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkOverlay whereWorkspaceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkOverlay withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkOverlay withoutTrashed()
 */
	class LinkOverlay extends \Eloquent {}
}

namespace App\LinkPages\Models{
/**
 * @property int $id
 * @property string $title
 * @property string $body
 * @property bool $hide_footer
 * @property bool $hide_navbar
 * @property int|null $user_id
 * @property int|null $workspace_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read string $model_type
 * @property-read \App\Models\User|null $user
 * @method static \App\LinkPages\Factories\LinkPageFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkPage matches(array $columns, string $value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkPage mysqlSearch(string $query)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkPage newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkPage newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkPage onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkPage query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkPage whereBelongsToActiveWorkspace()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkPage whereBody($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkPage whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkPage whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkPage whereHideFooter($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkPage whereHideNavbar($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkPage whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkPage whereTitle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkPage whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkPage whereUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkPage whereWorkspaceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkPage withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkPage withoutTrashed()
 */
	class LinkPage extends \Eloquent {}
}

namespace App\Links\Models{
/**
 * @property int $id
 * @property string|null $name
 * @property string $back_half
 * @property string $long_url
 * @property int $user_id
 * @property int|null $domain_id
 * @property string|null $password
 * @property \Illuminate\Support\Carbon|null $expires_at
 * @property string|null $description
 * @property string $type
 * @property int|null $type_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property int|null $workspace_id
 * @property int|null $folder_id
 * @property string|null $image
 * @property \Illuminate\Support\Carbon|null $clicked_at
 * @property int $clicks_count
 * @property \Illuminate\Support\Carbon|null $activates_at
 * @property string|null $utm
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Biolinks\Models\Biolink> $biolinks
 * @property-read int|null $biolinks_count
 * @property-read \Common\Domains\CustomDomain|null $domain
 * @property-read \App\Folders\Models\Folder|null $folder
 * @property-read string $model_type
 * @property-read mixed $short_url
 * @property-read \App\LinkPages\Models\LinkPage|null $linkPage
 * @property-read \App\LinkOverlays\Models\LinkOverlay|null $overlay
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\TrackingPixels\Models\TrackingPixel> $pixels
 * @property-read int|null $pixels_count
 * @property-read \App\QrCodes\Models\QrCode|null $qrCode
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Links\Models\LinkeableRule> $rules
 * @property-read int|null $rules_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Tags\Models\Tag> $tags
 * @property-read int|null $tags_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Analytics\Models\TrackedEvent> $trackedEvents
 * @property-read int|null $tracked_events_count
 * @property-read \App\Models\User|null $user
 * @method static \App\Links\Factories\LinkFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link forCurrentDomain()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link matches(array $columns, string $value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link mysqlSearch(string $query)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link whereActivatesAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link whereBackHalf($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link whereBelongsToActiveWorkspace()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link whereClickedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link whereClicksCount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link whereDomainId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link whereExpiresAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link whereFolderId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link whereHash(string $backHalf)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link whereImage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link whereLongUrl($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link wherePassword($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link whereType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link whereTypeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link whereUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link whereUtm($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link whereWorkspaceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Link withoutTrashed()
 */
	class Link extends \Eloquent {}
}

namespace App\Links\Models{
/**
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkImage newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkImage newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkImage query()
 */
	class LinkImage extends \Eloquent {}
}

namespace App\Links\Models{
/**
 * @property int $id
 * @property string $type
 * @property int $linkeable_id
 * @property string $linkeable_type
 * @property string $key
 * @property string|null $value
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkeableRule newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkeableRule newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkeableRule query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkeableRule whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkeableRule whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkeableRule whereKey($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkeableRule whereLinkeableId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkeableRule whereLinkeableType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkeableRule whereType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkeableRule whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LinkeableRule whereValue($value)
 */
	class LinkeableRule extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string|null $username
 * @property string|null $name
 * @property string|null $avatar_url
 * @property string|null $gender
 * @property string|null $legacy_permissions
 * @property string $email
 * @property string|null $kyc_status
 * @property string $type
 * @property string|null $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property string|null $two_factor_confirmed_at
 * @property string|null $card_brand
 * @property string|null $card_last_four
 * @property string|null $remember_token
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $language
 * @property string|null $country
 * @property string|null $timezone
 * @property string|null $image
 * @property string|null $stripe_id
 * @property string|null $paypal_id
 * @property \Illuminate\Support\Carbon|null $email_verified_at
 * @property string|null $card_expires
 * @property string|null $banned_at
 * @property-write mixed $available_space
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Common\Auth\Models\Ban> $bans
 * @property-read int|null $bans_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Biolinks\Models\Biolink> $biolinks
 * @property-read int|null $biolinks_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Common\Domains\CustomDomain> $customDomains
 * @property-read int|null $custom_domains_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Folders\Models\Folder> $folders
 * @property-read int|null $folders_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, User> $followedUsers
 * @property-read int|null $followed_users_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, User> $followers
 * @property-read int|null $followers_count
 * @property-read bool $has_password
 * @property-read string $model_type
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Kyc\Models\KycVerification> $kycVerifications
 * @property-read int|null $kyc_verifications_count
 * @property-read \App\Kyc\Models\KycVerification|null $latestKycVerification
 * @property-read \Common\Auth\Models\UserSession|null $latestUserSession
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\LinkOverlays\Models\LinkOverlay> $linkOverlays
 * @property-read int|null $link_overlays_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\LinkPages\Models\LinkPage> $linkPages
 * @property-read int|null $link_pages_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Links\Models\Link> $links
 * @property-read int|null $links_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Common\Notifications\NotificationSubscription> $notificationSubscriptions
 * @property-read int|null $notification_subscriptions_count
 * @property-read \Illuminate\Notifications\DatabaseNotificationCollection<int, \Illuminate\Notifications\DatabaseNotification> $notifications
 * @property-read int|null $notifications_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Common\Permissions\Models\Permission> $permissions
 * @property-read int|null $permissions_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\QrCodes\Models\QrCode> $qrCodes
 * @property-read int|null $qr_codes_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Common\Roles\Models\Role> $roles
 * @property-read int|null $roles_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Common\Auth\Models\SocialProfile> $social_profiles
 * @property-read int|null $social_profiles_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Common\Billing\Subscription> $subscriptions
 * @property-read int|null $subscriptions_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Laravel\Sanctum\PersonalAccessToken> $tokens
 * @property-read int|null $tokens_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\TrackingPixels\Models\TrackingPixel> $trackingPixels
 * @property-read int|null $tracking_pixels_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Common\Auth\Models\UserSession> $userSessions
 * @property-read int|null $user_sessions_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Common\Workspaces\Models\Workspace> $workspaces
 * @property-read int|null $workspaces_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User compact()
 * @method static \Database\Factories\UserFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User matches(array $columns, string $value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User mysqlSearch(string $query)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereAvatarUrl($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereBannedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereCardBrand($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereCardExpires($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereCardLastFour($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereCountry($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereEmailVerifiedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereGender($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereHasPermission(string $permission)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereImage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereKycStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereLanguage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereLegacyPermissions($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereNeedsNotificationFor(string $notifId)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePassword($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePaypalId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereRememberToken($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereStripeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereTimezone($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereTwoFactorConfirmedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereTwoFactorRecoveryCodes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereTwoFactorSecret($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereUsername($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User withRequestedRelations(array $params)
 */
	class User extends \Eloquent {}
}

namespace App\Payments\Models{
/**
 * @property int $id
 * @property string|null $tx_ref
 * @property bool $signature_valid
 * @property string $status
 * @property string|null $failure_reason
 * @property \Illuminate\Support\Carbon $received_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChapaWebhookDelivery newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChapaWebhookDelivery newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChapaWebhookDelivery query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChapaWebhookDelivery whereFailureReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChapaWebhookDelivery whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChapaWebhookDelivery whereReceivedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChapaWebhookDelivery whereSignatureValid($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChapaWebhookDelivery whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChapaWebhookDelivery whereTxRef($value)
 */
	class ChapaWebhookDelivery extends \Eloquent {}
}

namespace App\Payments\Models{
/**
 * @property int $id
 * @property string $uuid
 * @property string $gateway
 * @property string $payable_type
 * @property int $payable_id
 * @property string $purpose
 * @property string $tx_ref
 * @property numeric $amount
 * @property string $currency
 * @property string $status
 * @property string|null $checkout_url
 * @property string|null $gateway_transaction_id
 * @property string|null $buyer_email
 * @property string|null $buyer_name
 * @property array<array-key, mixed>|null $verification_data
 * @property \Illuminate\Support\Carbon|null $verified_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Model|\Eloquent $payable
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Storefront\Models\DigitalProductPaymentRefund> $refunds
 * @property-read int|null $refunds_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereBuyerEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereBuyerName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereCheckoutUrl($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereCurrency($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereGateway($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereGatewayTransactionId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction wherePayableId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction wherePayableType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction wherePurpose($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereTxRef($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereUuid($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereVerificationData($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PaymentTransaction whereVerifiedAt($value)
 */
	class PaymentTransaction extends \Eloquent {}
}

namespace App\Payments\Models{
/**
 * @property int $id
 * @property int $subscription_id
 * @property int $days_before
 * @property \Illuminate\Support\Carbon $sent_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Common\Billing\Subscription|null $subscription
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubscriptionRenewalReminder newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubscriptionRenewalReminder newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubscriptionRenewalReminder query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubscriptionRenewalReminder whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubscriptionRenewalReminder whereDaysBefore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubscriptionRenewalReminder whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubscriptionRenewalReminder whereSentAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubscriptionRenewalReminder whereSubscriptionId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubscriptionRenewalReminder whereUpdatedAt($value)
 */
	class SubscriptionRenewalReminder extends \Eloquent {}
}

namespace App\QrCodes\Models{
/**
 * @property int $id
 * @property string $back_half
 * @property int $domain_id
 * @property int|null $linkeable_id
 * @property string|null $linkeable_type
 * @property string|null $name
 * @property string|null $long_url
 * @property int $user_id
 * @property int $workspace_id
 * @property \Illuminate\Support\Carbon|null $expires_at
 * @property \Illuminate\Support\Carbon|null $scanned_at
 * @property int $scans_count
 * @property string|null $password
 * @property string|null $utm
 * @property array<array-key, mixed>|null $style
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read string $model_type
 * @property-read \Illuminate\Database\Eloquent\Model|\Eloquent|null $linkeable
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\TrackingPixels\Models\TrackingPixel> $pixels
 * @property-read int|null $pixels_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Links\Models\LinkeableRule> $rules
 * @property-read int|null $rules_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Tags\Models\Tag> $tags
 * @property-read int|null $tags_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Analytics\Models\TrackedEvent> $trackedEvents
 * @property-read int|null $tracked_events_count
 * @property-read \App\Models\User|null $user
 * @method static \App\QrCodes\Factories\QrCodeFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode forCurrentDomain()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode matches(array $columns, string $value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode mysqlSearch(string $query)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode whereBackHalf($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode whereBelongsToActiveWorkspace()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode whereDomainId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode whereExpiresAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode whereLinkeableId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode whereLinkeableType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode whereLongUrl($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode wherePassword($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode whereScannedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode whereScansCount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode whereStyle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode whereUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode whereUtm($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode whereWorkspaceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QrCode withoutTrashed()
 */
	class QrCode extends \Eloquent {}
}

namespace App\Storefront\Models{
/**
 * @property int $id
 * @property int $workspace_id
 * @property int $user_id
 * @property int|null $cover_file_entry_id
 * @property string $title
 * @property string|null $description
 * @property int $price_cents
 * @property string $currency
 * @property string $status
 * @property string|null $rejection_reason
 * @property \Illuminate\Support\Carbon|null $approved_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Biolinks\Models\Biolink> $biolinks
 * @property-read int|null $biolinks_count
 * @property-read \Common\Files\FileEntry|null $cover
 * @property-read \App\Models\User $creator
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Common\Files\FileEntry> $files
 * @property-read int|null $files_count
 * @property-read string $model_type
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Storefront\Models\StorefrontOrder> $orders
 * @property-read int|null $orders_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProduct matches(array $columns, string $value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProduct mysqlSearch(string $query)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProduct newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProduct newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProduct onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProduct query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProduct whereApprovedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProduct whereBelongsToActiveWorkspace()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProduct whereCoverFileEntryId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProduct whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProduct whereCurrency($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProduct whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProduct whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProduct whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProduct wherePriceCents($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProduct whereRejectionReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProduct whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProduct whereTitle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProduct whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProduct whereUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProduct whereWorkspaceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProduct withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProduct withoutTrashed()
 */
	class DigitalProduct extends \Eloquent {}
}

namespace App\Storefront\Models{
/**
 * @property int $id
 * @property string $uuid
 * @property int $workspace_id
 * @property int $creator_id
 * @property int|null $storefront_order_id
 * @property int|null $payout_request_id
 * @property string $entry_type
 * @property int $amount_cents
 * @property string $currency
 * @property \Illuminate\Support\Carbon|null $available_at
 * @property string $source_key
 * @property string|null $description
 * @property array<array-key, mixed>|null $metadata
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User $creator
 * @property-read string $model_type
 * @property-read \App\Storefront\Models\StorefrontOrder|null $order
 * @property-read \App\Storefront\Models\PayoutRequest|null $payoutRequest
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductEarningsLedger matches(array $columns, string $value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductEarningsLedger mysqlSearch(string $query)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductEarningsLedger newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductEarningsLedger newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductEarningsLedger query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductEarningsLedger whereAmountCents($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductEarningsLedger whereAvailableAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductEarningsLedger whereBelongsToActiveWorkspace()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductEarningsLedger whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductEarningsLedger whereCreatorId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductEarningsLedger whereCurrency($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductEarningsLedger whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductEarningsLedger whereEntryType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductEarningsLedger whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductEarningsLedger whereMetadata($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductEarningsLedger wherePayoutRequestId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductEarningsLedger whereSourceKey($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductEarningsLedger whereStorefrontOrderId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductEarningsLedger whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductEarningsLedger whereUuid($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductEarningsLedger whereWorkspaceId($value)
 */
	class DigitalProductEarningsLedger extends \Eloquent {}
}

namespace App\Storefront\Models{
/**
 * @property int $id
 * @property string $uuid
 * @property string $email
 * @property string $email_hash
 * @property string $token_hash
 * @property \Illuminate\Support\Carbon $expires_at
 * @property \Illuminate\Support\Carbon|null $redeemed_at
 * @property string|null $session_token_hash
 * @property \Illuminate\Support\Carbon|null $session_expires_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Storefront\Models\DigitalProductOrderRecoveryDelivery> $deliveries
 * @property-read int|null $deliveries_count
 * @property-read string $model_type
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecovery matches(array $columns, string $value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecovery mysqlSearch(string $query)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecovery newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecovery newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecovery query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecovery whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecovery whereEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecovery whereEmailHash($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecovery whereExpiresAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecovery whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecovery whereRedeemedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecovery whereSessionExpiresAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecovery whereSessionTokenHash($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecovery whereTokenHash($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecovery whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecovery whereUuid($value)
 */
	class DigitalProductOrderRecovery extends \Eloquent {}
}

namespace App\Storefront\Models{
/**
 * @property int $id
 * @property int|null $digital_product_order_recovery_id
 * @property int|null $storefront_order_id
 * @property string $email_hash
 * @property string $masked_email
 * @property string $event
 * @property string $status
 * @property string|null $failure_code
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read string $model_type
 * @property-read \App\Storefront\Models\StorefrontOrder|null $order
 * @property-read \App\Storefront\Models\DigitalProductOrderRecovery|null $recovery
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecoveryDelivery matches(array $columns, string $value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecoveryDelivery mysqlSearch(string $query)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecoveryDelivery newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecoveryDelivery newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecoveryDelivery query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecoveryDelivery whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecoveryDelivery whereDigitalProductOrderRecoveryId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecoveryDelivery whereEmailHash($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecoveryDelivery whereEvent($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecoveryDelivery whereFailureCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecoveryDelivery whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecoveryDelivery whereMaskedEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecoveryDelivery whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecoveryDelivery whereStorefrontOrderId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductOrderRecoveryDelivery whereUpdatedAt($value)
 */
	class DigitalProductOrderRecoveryDelivery extends \Eloquent {}
}

namespace App\Storefront\Models{
/**
 * @property int $id
 * @property int $payment_transaction_id
 * @property int $storefront_order_id
 * @property int $recorded_by
 * @property int $amount_cents
 * @property int $creator_earnings_reversal_cents
 * @property int $platform_fee_reversal_cents
 * @property string $currency
 * @property string|null $external_reference
 * @property string $reason
 * @property \Illuminate\Support\Carbon $refunded_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read string $model_type
 * @property-read \App\Storefront\Models\StorefrontOrder $order
 * @property-read \App\Models\User $recorder
 * @property-read \App\Payments\Models\PaymentTransaction $transaction
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPaymentRefund matches(array $columns, string $value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPaymentRefund mysqlSearch(string $query)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPaymentRefund newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPaymentRefund newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPaymentRefund query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPaymentRefund whereAmountCents($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPaymentRefund whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPaymentRefund whereCreatorEarningsReversalCents($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPaymentRefund whereCurrency($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPaymentRefund whereExternalReference($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPaymentRefund whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPaymentRefund wherePaymentTransactionId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPaymentRefund wherePlatformFeeReversalCents($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPaymentRefund whereReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPaymentRefund whereRecordedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPaymentRefund whereRefundedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPaymentRefund whereStorefrontOrderId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPaymentRefund whereUpdatedAt($value)
 */
	class DigitalProductPaymentRefund extends \Eloquent {}
}

namespace App\Storefront\Models{
/**
 * @property int $id
 * @property int $payout_request_id
 * @property int $revealed_by
 * @property string|null $reason
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read string $model_type
 * @property-read \App\Storefront\Models\PayoutRequest $payoutRequest
 * @property-read \App\Models\User $revealer
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutDestinationReveal matches(array $columns, string $value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutDestinationReveal mysqlSearch(string $query)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutDestinationReveal newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutDestinationReveal newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutDestinationReveal query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutDestinationReveal whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutDestinationReveal whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutDestinationReveal wherePayoutRequestId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutDestinationReveal whereReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutDestinationReveal whereRevealedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutDestinationReveal whereUpdatedAt($value)
 */
	class DigitalProductPayoutDestinationReveal extends \Eloquent {}
}

namespace App\Storefront\Models{
/**
 * @property int $id
 * @property int $workspace_id
 * @property int $creator_id
 * @property int|null $withdrawal_method_id
 * @property string $type
 * @property string $account_holder
 * @property string $destination
 * @property string $display_label
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User $creator
 * @property-read string $model_type
 * @property-read \App\Storefront\Models\DigitalProductWithdrawalMethod|null $withdrawalMethod
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutMethod matches(array $columns, string $value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutMethod mysqlSearch(string $query)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutMethod newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutMethod newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutMethod query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutMethod whereAccountHolder($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutMethod whereBelongsToActiveWorkspace()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutMethod whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutMethod whereCreatorId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutMethod whereDestination($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutMethod whereDisplayLabel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutMethod whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutMethod whereType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutMethod whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutMethod whereWithdrawalMethodId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutMethod whereWorkspaceId($value)
 */
	class DigitalProductPayoutMethod extends \Eloquent {}
}

namespace App\Storefront\Models{
/**
 * @property int $id
 * @property int $payout_request_id
 * @property int|null $actor_id
 * @property string $action
 * @property string|null $note
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $actor
 * @property-read string $model_type
 * @property-read \App\Storefront\Models\PayoutRequest $payoutRequest
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutRequestActivity matches(array $columns, string $value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutRequestActivity mysqlSearch(string $query)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutRequestActivity newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutRequestActivity newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutRequestActivity query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutRequestActivity whereAction($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutRequestActivity whereActorId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutRequestActivity whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutRequestActivity whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutRequestActivity whereNote($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutRequestActivity wherePayoutRequestId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductPayoutRequestActivity whereUpdatedAt($value)
 */
	class DigitalProductPayoutRequestActivity extends \Eloquent {}
}

namespace App\Storefront\Models{
/**
 * @property int $id
 * @property string $name
 * @property string $code
 * @property string $destination_label
 * @property string|null $instructions
 * @property int $minimum_amount_cents
 * @property int|null $maximum_amount_cents
 * @property bool $is_active
 * @property int $position
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read string $model_type
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductWithdrawalMethod active()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductWithdrawalMethod matches(array $columns, string $value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductWithdrawalMethod mysqlSearch(string $query)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductWithdrawalMethod newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductWithdrawalMethod newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductWithdrawalMethod query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductWithdrawalMethod whereCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductWithdrawalMethod whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductWithdrawalMethod whereDestinationLabel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductWithdrawalMethod whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductWithdrawalMethod whereInstructions($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductWithdrawalMethod whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductWithdrawalMethod whereMaximumAmountCents($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductWithdrawalMethod whereMinimumAmountCents($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductWithdrawalMethod whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductWithdrawalMethod wherePosition($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalProductWithdrawalMethod whereUpdatedAt($value)
 */
	class DigitalProductWithdrawalMethod extends \Eloquent {}
}

namespace App\Storefront\Models{
/**
 * @property int $id
 * @property string $token
 * @property int $storefront_order_id
 * @property int $file_entry_id
 * @property int $download_count
 * @property int $download_limit
 * @property \Illuminate\Support\Carbon $expires_at
 * @property \Illuminate\Support\Carbon|null $revoked_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Common\Files\FileEntry|null $file
 * @property-read string $model_type
 * @property-read \App\Storefront\Models\StorefrontOrder $order
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DownloadEntitlement matches(array $columns, string $value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DownloadEntitlement mysqlSearch(string $query)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DownloadEntitlement newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DownloadEntitlement newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DownloadEntitlement query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DownloadEntitlement whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DownloadEntitlement whereDownloadCount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DownloadEntitlement whereDownloadLimit($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DownloadEntitlement whereExpiresAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DownloadEntitlement whereFileEntryId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DownloadEntitlement whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DownloadEntitlement whereRevokedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DownloadEntitlement whereStorefrontOrderId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DownloadEntitlement whereToken($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DownloadEntitlement whereUpdatedAt($value)
 */
	class DownloadEntitlement extends \Eloquent {}
}

namespace App\Storefront\Models{
/**
 * @property int $id
 * @property int $workspace_id
 * @property int $creator_id
 * @property int|null $digital_product_payout_method_id
 * @property int|null $withdrawal_method_id
 * @property string $currency
 * @property string|null $payout_method_label
 * @property string|null $withdrawal_method_name
 * @property string|null $payout_destination
 * @property int $amount_cents
 * @property string $status
 * @property int|null $processed_by
 * @property string|null $transfer_reference
 * @property string|null $admin_notes
 * @property string|null $rejection_reason
 * @property \Illuminate\Support\Carbon|null $paid_at
 * @property \Illuminate\Support\Carbon|null $processing_at
 * @property \Illuminate\Support\Carbon|null $rejected_at
 * @property \Illuminate\Support\Carbon|null $cancelled_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Storefront\Models\DigitalProductPayoutRequestActivity> $activities
 * @property-read int|null $activities_count
 * @property-read \App\Models\User $creator
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Storefront\Models\DigitalProductPayoutDestinationReveal> $destinationReveals
 * @property-read int|null $destination_reveals_count
 * @property-read string $model_type
 * @property-read \App\Storefront\Models\DigitalProductPayoutMethod|null $payoutMethod
 * @property-read \App\Models\User|null $processor
 * @property-read \App\Storefront\Models\DigitalProductWithdrawalMethod|null $withdrawalMethod
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest matches(array $columns, string $value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest mysqlSearch(string $query)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest whereAdminNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest whereAmountCents($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest whereBelongsToActiveWorkspace()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest whereCancelledAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest whereCreatorId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest whereCurrency($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest whereDigitalProductPayoutMethodId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest wherePaidAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest wherePayoutDestination($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest wherePayoutMethodLabel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest whereProcessedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest whereProcessingAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest whereRejectedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest whereRejectionReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest whereTransferReference($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest whereWithdrawalMethodId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest whereWithdrawalMethodName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PayoutRequest whereWorkspaceId($value)
 */
	class PayoutRequest extends \Eloquent {}
}

namespace App\Storefront\Models{
/**
 * @property int $id
 * @property string $uuid
 * @property int $digital_product_id
 * @property int|null $biolink_id
 * @property int $creator_id
 * @property string|null $buyer_email
 * @property string|null $buyer_name
 * @property string $currency
 * @property int $gross_amount_cents
 * @property int $commission_bps
 * @property int $platform_fee_cents
 * @property int $creator_earnings_cents
 * @property string $status
 * @property string|null $payment_gateway
 * @property string|null $chapa_tx_ref
 * @property string|null $stripe_checkout_session_id
 * @property string|null $stripe_payment_intent_id
 * @property \Illuminate\Support\Carbon|null $paid_at
 * @property \Illuminate\Support\Carbon|null $receipt_sent_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Biolinks\Models\Biolink|null $biolink
 * @property-read \App\Models\User $creator
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Storefront\Models\DigitalProductEarningsLedger> $earningsLedger
 * @property-read int|null $earnings_ledger_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Storefront\Models\DownloadEntitlement> $entitlements
 * @property-read int|null $entitlements_count
 * @property-read string $model_type
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Storefront\Models\StorefrontOrderItem> $items
 * @property-read int|null $items_count
 * @property-read \App\Storefront\Models\DigitalProduct|null $product
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Storefront\Models\DigitalProductPaymentRefund> $refunds
 * @property-read int|null $refunds_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder matches(array $columns, string $value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder mysqlSearch(string $query)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder whereBiolinkId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder whereBuyerEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder whereBuyerName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder whereChapaTxRef($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder whereCommissionBps($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder whereCreatorEarningsCents($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder whereCreatorId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder whereCurrency($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder whereDigitalProductId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder whereGrossAmountCents($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder wherePaidAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder wherePaymentGateway($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder wherePlatformFeeCents($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder whereReceiptSentAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder whereStripeCheckoutSessionId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder whereStripePaymentIntentId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrder whereUuid($value)
 */
	class StorefrontOrder extends \Eloquent {}
}

namespace App\Storefront\Models{
/**
 * @property int $id
 * @property int $storefront_order_id
 * @property int $digital_product_id
 * @property string $title
 * @property int $unit_amount_cents
 * @property int $quantity
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read string $model_type
 * @property-read \App\Storefront\Models\StorefrontOrder $order
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrderItem matches(array $columns, string $value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrderItem mysqlSearch(string $query)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrderItem newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrderItem newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrderItem query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrderItem whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrderItem whereDigitalProductId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrderItem whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrderItem whereQuantity($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrderItem whereStorefrontOrderId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrderItem whereTitle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrderItem whereUnitAmountCents($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|StorefrontOrderItem whereUpdatedAt($value)
 */
	class StorefrontOrderItem extends \Eloquent {}
}

namespace App\Tags\Models{
/**
 * @property int $id
 * @property string $name
 * @property string|null $display_name
 * @property string $type
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $user_id
 * @property int $workspace_id
 * @property-read string $model_type
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tag matches(array $columns, string $value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tag mysqlSearch(string $query)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tag newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tag newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tag query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tag whereBelongsToActiveWorkspace()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tag whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tag whereDisplayName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tag whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tag whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tag whereType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tag whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tag whereUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tag whereWorkspaceId($value)
 */
	class Tag extends \Eloquent {}
}

namespace App\TrackingPixels\Models{
/**
 * @property int $id
 * @property string $name
 * @property string $type
 * @property string|null $pixel_id
 * @property int $user_id
 * @property string|null $head_code
 * @property string|null $body_code
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $workspace_id
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read string $model_type
 * @property-read \App\Models\User|null $user
 * @method static \App\TrackingPixels\Factories\TrackingPixelFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackingPixel matches(array $columns, string $value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackingPixel mysqlSearch(string $query)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackingPixel newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackingPixel newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackingPixel onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackingPixel query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackingPixel whereBelongsToActiveWorkspace()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackingPixel whereBodyCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackingPixel whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackingPixel whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackingPixel whereHeadCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackingPixel whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackingPixel whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackingPixel wherePixelId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackingPixel whereType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackingPixel whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackingPixel whereUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackingPixel whereWorkspaceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackingPixel withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrackingPixel withoutTrashed()
 */
	class TrackingPixel extends \Eloquent {}
}

namespace App\Webhooks\Models{
/**
 * @property string $id
 * @property int $user_id
 * @property string $name
 * @property string $url
 * @property string $signing_secret
 * @property array<array-key, mixed> $selected_events
 * @property int $consecutive_failures
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Webhooks\Models\WebhookDelivery> $deliveries
 * @property-read int|null $deliveries_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Webhooks\Models\WebhookDeliveryAttempt> $deliveryAttempts
 * @property-read int|null $delivery_attempts_count
 * @property-read string $model_type
 * @property-read \App\Models\User|null $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Webhook matches(array $columns, string $value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Webhook mysqlSearch(string $query)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Webhook newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Webhook newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Webhook onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Webhook query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Webhook whereConsecutiveFailures($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Webhook whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Webhook whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Webhook whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Webhook whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Webhook whereSelectedEvents($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Webhook whereSigningSecret($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Webhook whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Webhook whereUrl($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Webhook whereUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Webhook withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Webhook withoutTrashed()
 */
	class Webhook extends \Eloquent {}
}

namespace App\Webhooks\Models{
/**
 * @property string $id
 * @property string $webhook_id
 * @property string $event_type
 * @property string $status
 * @property array<array-key, mixed> $payload
 * @property-read int|null $attempts_count
 * @property \Illuminate\Support\Carbon|null $last_attempt_at
 * @property \Illuminate\Support\Carbon|null $delivered_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Webhooks\Models\WebhookDeliveryAttempt> $attempts
 * @property-read \App\Webhooks\Models\Webhook|null $webhook
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WebhookDelivery newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WebhookDelivery newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WebhookDelivery query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WebhookDelivery whereAttemptsCount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WebhookDelivery whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WebhookDelivery whereDeliveredAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WebhookDelivery whereEventType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WebhookDelivery whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WebhookDelivery whereLastAttemptAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WebhookDelivery wherePayload($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WebhookDelivery whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WebhookDelivery whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WebhookDelivery whereWebhookId($value)
 */
	class WebhookDelivery extends \Eloquent {}
}

namespace App\Webhooks\Models{
/**
 * @property string $id
 * @property string $webhook_id
 * @property string $webhook_delivery_id
 * @property int $attempt_number
 * @property int|null $response_status
 * @property string|null $response_body
 * @property int $duration_ms
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Webhooks\Models\WebhookDelivery|null $delivery
 * @property-read \App\Webhooks\Models\Webhook|null $webhook
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WebhookDeliveryAttempt newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WebhookDeliveryAttempt newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WebhookDeliveryAttempt query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WebhookDeliveryAttempt whereAttemptNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WebhookDeliveryAttempt whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WebhookDeliveryAttempt whereDurationMs($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WebhookDeliveryAttempt whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WebhookDeliveryAttempt whereResponseBody($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WebhookDeliveryAttempt whereResponseStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WebhookDeliveryAttempt whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WebhookDeliveryAttempt whereWebhookDeliveryId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WebhookDeliveryAttempt whereWebhookId($value)
 */
	class WebhookDeliveryAttempt extends \Eloquent {}
}

