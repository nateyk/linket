<?php

namespace App\Storefront\Jobs;

use App\Storefront\Models\DigitalProduct;
use App\Storefront\ProductSettings;
use Common\Files\Actions\CreateFileEntry;
use Common\Files\Actions\StoreFile;
use Common\Files\FileEntry;
use Common\Files\FileEntryPayload;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Intervention\Image\ImageManager;

class ConvertProductCoverToWebp implements ShouldQueue
{
    use Dispatchable, Queueable, SerializesModels;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(
        public int $productId,
        public int $coverFileEntryId,
    ) {
        $this->onQueue('default');
    }

    public function handle(): void
    {
        if (!app(ProductSettings::class)->convertsCoversToWebp() || !extension_loaded('gd')) {
            return;
        }

        $product = DigitalProduct::query()->find($this->productId);
        if (!$product || $product->cover_file_entry_id !== $this->coverFileEntryId) {
            return;
        }

        $entry = FileEntry::query()->find($this->coverFileEntryId);
        if (
            !$entry ||
            $entry->upload_type !== 'linkImages' ||
            !str_starts_with((string) $entry->mime, 'image/') ||
            !in_array(strtolower((string) $entry->extension), ['jpg', 'jpeg', 'png', 'bmp'], true)
        ) {
            return;
        }

        $webp = $this->convert($entry);
        if ($webp === null) {
            return;
        }

        $newEntry = $this->store($entry, $webp);

        DigitalProduct::query()
            ->whereKey($this->productId)
            ->where('cover_file_entry_id', $this->coverFileEntryId)
            ->update(['cover_file_entry_id' => $newEntry->id]);
    }

    private function convert(FileEntry $entry): ?string
    {
        $contents = $entry->getDisk()->get($entry->getStoragePath());
        if ($contents === null || $contents === false) {
            return null;
        }

        try {
            return (string) ImageManager::gd()
                ->read($contents)
                ->toWebp(quality: 82);
        } catch (\Throwable) {
            return null;
        }
    }

    private function store(FileEntry $entry, string $webp): FileEntry
    {
        $payload = new FileEntryPayload([
            'uploadType' => 'linkImages',
            'type' => 'file',
            'clientName' => pathinfo($entry->name, PATHINFO_FILENAME) . '.webp',
            'clientMime' => 'image/webp',
            'clientExtension' => 'webp',
            'size' => strlen($webp),
            'workspaceId' => $entry->workspace_id,
            'ownerId' => $entry->owner_id,
        ]);

        $tmp = tempnam(sys_get_temp_dir(), 'webp');
        if ($tmp === false) {
            throw new \RuntimeException('Unable to create a temporary file for WebP conversion.');
        }

        file_put_contents($tmp, $webp);

        try {
            $stored = (new StoreFile())->execute($payload, ['file' => new \Illuminate\Http\File($tmp)]);
        } finally {
            @unlink($tmp);
        }

        if ($stored === false) {
            throw new \RuntimeException('Failed to store the converted WebP cover.');
        }

        return (new CreateFileEntry())->execute($payload);
    }
}
