<?php

namespace Ai\AiAgent\Ingest\Parsing;

use League\HTMLToMarkdown\Converter\TableConverter;
use League\HTMLToMarkdown\HtmlConverter;

class HtmlToMarkdown
{
    public function execute(string $html): string
    {
        $converter = new HtmlConverter([
            'strip_tags' => true,
            'remove_nodes' => 'img video iframe',
            'strip_placeholder_links' => true,
            'header_style' => 'atx',
        ]);
        $converter->getEnvironment()->addConverter(new TableConverter());

        return $converter->convert($html);
    }
}
