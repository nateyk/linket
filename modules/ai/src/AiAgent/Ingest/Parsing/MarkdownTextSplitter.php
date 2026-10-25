<?php

namespace Ai\AiAgent\Ingest\Parsing;

class MarkdownTextSplitter
{
    protected array $separators = [
        # First, try to split along Markdown headings (starting with level 2)
        "\n#{1,6} ",
        # Note the alternative syntax for headings (below) is not handled here
        # Heading level 2
        # ---------------
        # End of code block
        "```\n",
        # Horizontal lines
        "\n\\*\\*\\*+\n",
        "\n---+\n",
        "\n___+\n",
        # Note that this splitter doesn't handle horizontal lines defined
        # by *three or more* of ***, ---, or ___, but this is not handled
        "\n\n",
        "\n",
        ' ',
        '',
    ];

    public function __construct(
        protected int $chunkSize = 400,
        protected int $chunkOverlap = 100,
        protected int $minChunkSize = 80,
    ) {}

    public function split(string $text): array
    {
        $chunks = $this->_splitText($text, $this->separators);

        foreach ($chunks as $key => $chunk) {
            if (
                strlen($chunk) < $this->minChunkSize &&
                isset($chunks[$key + 1])
            ) {
                $chunks[$key + 1] = trim($chunk . $chunks[$key + 1]);
                unset($chunks[$key]);
            } else {
                $chunks[$key] = trim($chunk);
            }
        }

        return $chunks;
    }

    protected function _splitText(string $text, array $separators): array
    {
        // Split incoming text and return chunks
        $finalChunks = [];

        // Get the appropriate separator to use
        $separator = end($separators);
        $newSeparators = [];

        foreach ($separators as $i => $currentSeparator) {
            if ($currentSeparator === '') {
                $separator = $currentSeparator;
                break;
            }
            if (preg_match("/$currentSeparator/", $text)) {
                $separator = $currentSeparator;
                $newSeparators = array_slice($separators, $i + 1);
                break;
            }
        }

        $splits = $this->splitTextWithRegex($text, $separator);

        // Now merge chunks, recursively splitting longer texts
        $goodSplits = [];

        foreach ($splits as $split) {
            if (strlen($split) < $this->chunkSize) {
                $goodSplits[] = $split;
            } else {
                if (!empty($goodSplits)) {
                    $mergedText = $this->mergeSplits($goodSplits);
                    $finalChunks = array_merge($finalChunks, $mergedText);
                    $goodSplits = [];
                }

                if (empty($newSeparators)) {
                    $finalChunks[] = $split;
                } else {
                    $otherInfo = $this->_splitText($split, $newSeparators);
                    $finalChunks = array_merge($finalChunks, $otherInfo);
                }
            }
        }

        if (!empty($goodSplits)) {
            $mergedText = $this->mergeSplits($goodSplits);
            $finalChunks = array_merge($finalChunks, $mergedText);
        }

        return $finalChunks;
    }

    protected function splitTextWithRegex(
        string $text,
        string $separator,
        string $keepSeparator = 'start',
    ): array {
        // Handle cases where there is a separator
        if ($separator) {
            // The parentheses in the pattern keep the delimiters in the result
            $splitsWithSeparator = preg_split(
                "/($separator)/",
                $text,
                -1,
                PREG_SPLIT_NO_EMPTY | PREG_SPLIT_DELIM_CAPTURE,
            );

            $splits =
                $keepSeparator === 'start' ? [$splitsWithSeparator[0]] : [];

            foreach ($splitsWithSeparator as $key => $split) {
                if ($key % 2 !== 0) {
                    if ($keepSeparator === 'start') {
                        $splits[] =
                            $split . ($splitsWithSeparator[$key + 1] ?? '');
                    } else {
                        $splits[] =
                            ($splitsWithSeparator[$key - 1] ?? '') . $split;
                    }
                }
            }
        } else {
            // Split into individual characters if no separator
            $splits = preg_split('//u', $text, -1, PREG_SPLIT_NO_EMPTY);
        }

        // Filter out empty strings
        return array_filter($splits, fn($s) => $s !== '');
    }

    protected function mergeSplits(array $splits): array
    {
        $docs = [];
        $currentDoc = [];
        $total = 0;

        foreach ($splits as $d) {
            $len = strlen($d);
            if ($total + $len > $this->chunkSize) {
                if (count($currentDoc) > 0) {
                    $doc = $this->joinDocs($currentDoc);
                    if ($doc !== null) {
                        $docs[] = $doc;
                    }

                    // Keep on popping if:
                    // - we have a larger chunk than in the chunk overlap
                    // - or if we still have any chunks and the length is long
                    while (
                        $total > $this->chunkOverlap ||
                        ($total + $len > $this->chunkSize && $total > 0)
                    ) {
                        $total -= strlen($currentDoc[0]);
                        array_shift($currentDoc);
                    }
                }
            }
            $currentDoc[] = $d;
            $total += $len;
        }

        $doc = $this->joinDocs($currentDoc);
        if ($doc !== null) {
            $docs[] = $doc;
        }

        return $docs;
    }

    protected function joinDocs(array $docs, string $separator = ''): ?string
    {
        $text = implode($separator, $docs);

        if ($text === '') {
            return null;
        } else {
            return $text;
        }
    }
}
