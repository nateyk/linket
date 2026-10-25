<?php

namespace Ai\AiAgent\Commands;

use Ai\AiAgent\Flows\Nodes\NodeType;
use Ai\AiAgent\Models\AiAgentFlow;
use Common\Files\Actions\Deletion\PermanentlyDeleteEntries;
use Common\Files\FileEntry;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DeleteFlowUploadArtifactsCommand extends Command
{
    protected $signature = 'flow:delete-upload-artifacts';

    public function handle(): void
    {
        $folder = 'flow_uploads';
        $storage = Storage::disk('public');

        if ($storage->exists($folder)) {
            $data = AiAgentFlow::all()->reduce(function (
                ?array $carry,
                AiAgentFlow $flow,
            ) {
                $entryIds = $carry['entryIds'] ?? collect([]);
                $entryUrls = $carry['entryUrls'] ?? collect([]);

                foreach ($flow->config['nodes'] as $node) {
                    if (isset($node['attachmentIds'])) {
                        $entryIds = $entryIds->merge($node['attachmentIds']);
                    }

                    if ($node['type'] === NodeType::Cards) {
                        foreach ($node['cards'] as $card) {
                            if (isset($card['image'])) {
                                $entryUrls = $entryUrls->push($card['image']);
                            }
                        }
                    }
                }

                return [
                    'entryIds' => $entryIds,
                    'entryUrls' => $entryUrls,
                ];
            });

            $fileNames = collect($storage->allFiles($folder))->map(
                fn($path) => basename($path),
            );

            $entries = FileEntry::whereIn('file_name', $fileNames)
                ->get()
                ->filter(fn($entry) => $this->shouldDelete($entry, $data));

            app(PermanentlyDeleteEntries::class)->execute(
                $entries->pluck('id'),
            );

            $this->info(
                "Deleted {$entries->count()} unused flow upload artifacts.",
            );
        }
    }

    protected function shouldDelete(FileEntry $entry, array $usageData): bool
    {
        if ($usageData['entryIds']->contains($entry->id)) {
            return false;
        }

        if (
            $usageData['entryUrls']->first(
                fn($url) => Str::contains($url, $entry->file_name),
            )
        ) {
            return false;
        }

        return true;
    }
}
