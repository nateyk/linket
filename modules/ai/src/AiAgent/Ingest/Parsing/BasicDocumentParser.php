<?php

namespace Ai\AiAgent\Ingest\Parsing;

use Common\Files\FileEntry;
use Exception;
use Smalot\PdfParser\Parser;

class BasicDocumentParser
{
    public function parse(FileEntry $fileEntry): string
    {
        $extension = $fileEntry->extension;

        if (in_array($extension, $this->getBasicTextExtensions())) {
            return $fileEntry->getDisk()->get($fileEntry->getStoragePath());
        }

        if ($extension === 'pdf') {
            $pdfParser = new Parser();

            try {
                $fileContent = $fileEntry
                    ->getDisk()
                    ->get($fileEntry->getStoragePath());
                return $pdfParser->parseContent($fileContent)->getText();
            } catch (Exception $e) {
                throw new Exception(
                    "Failed to parse PDF file: {$e->getMessage()}",
                );
            }
        }

        throw new Exception("Unsupported file extension: $extension");
    }

    protected function getBasicTextExtensions(): array
    {
        return ['json', 'md', 'txt'];
    }
}
