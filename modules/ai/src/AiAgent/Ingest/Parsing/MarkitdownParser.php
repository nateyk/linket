<?php

namespace Ai\AiAgent\Ingest\Parsing;

use Common\Files\FileEntry;
use Exception;
use Illuminate\Support\Facades\Process;

class MarkitdownParser
{
    public function parseUploadedFile(FileEntry $fileEntry): string
    {
        $content = $fileEntry->getDisk()->get($fileEntry->getStoragePath());

        if ($fileEntry->extension === 'txt') {
            return $content;
        }

        return $this->parseContent($content);
    }

    public function parseContent(string $content): string
    {
        $result = Process::env([
            'PATH' => config('app.markitdown_path'),
        ])
            ->input($content)
            ->run('markitdown');

        if (!$result->successful()) {
            $output = $result->errorOutput();
            if (str_contains($output, 'markdown: command not found')) {
                throw new Exception(
                    'markitdown not found. Make sure it is installed and available in $PATH.',
                );
            } else {
                throw new Exception("Failed to parse markdown file: $output");
            }
        }

        return $result->output();
    }
}
