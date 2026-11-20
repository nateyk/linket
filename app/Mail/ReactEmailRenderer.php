<?php

namespace App\Mail;

use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Process\Process;

final class ReactEmailRenderer
{
    public function __construct(
        private readonly ?string $nodeBinary = null,
        private readonly ?string $scriptPath = null,
        private readonly int $timeoutSeconds = 30,
    ) {
    }

    /**
     * @param  array<string, mixed>  $props
     * @return array{html: string, text: string}
     */
    public function render(string $template, array $props): array
    {
        $bundledCjs = base_path('scripts/dist/render-email.cjs');
        $bundledMjs = base_path('scripts/dist/render-email.mjs');
        $bundledScript = is_file($bundledCjs) ? $bundledCjs : (is_file($bundledMjs) ? $bundledMjs : null);
        $tsx = base_path('node_modules/.bin/tsx');

        if ($this->shouldFallback($bundledScript, $tsx)) {
            return $this->fallbackRender($props);
        }

        $node = $this->nodeBinary ?? 'node';
        $script = $this->scriptPath ?? ($bundledScript ?? base_path('scripts/render-email.tsx'));

        $isBundledScript = str_ends_with($script, '.mjs') || str_ends_with($script, '.cjs');
        $command = $isBundledScript
            ? [$node, $script, '--template', $template]
            : [$node, $tsx, $script, '--template', $template];

        $process = new Process(
            command: $command,
            cwd: base_path(),
            timeout: $this->timeoutSeconds,
        );
        $process->setInput(json_encode($props, JSON_THROW_ON_ERROR));

        try {
            $process->mustRun();
        } catch (ProcessFailedException $e) {
            throw new ReactEmailRenderException(
                'React Email render failed: '.$process->getErrorOutput(),
                previous: $e,
            );
        }

        /** @var array{html?: mixed, text?: mixed} $decoded */
        $decoded = json_decode($process->getOutput(), true, flags: JSON_THROW_ON_ERROR);

        if (! is_string($decoded['html'] ?? null) || ! is_string($decoded['text'] ?? null)) {
            throw new ReactEmailRenderException('React Email render returned invalid JSON payload.');
        }

        return [
            'html' => $decoded['html'],
            'text' => $decoded['text'],
        ];
    }

    private function shouldFallback(mixed $bundledScript, mixed $tsx): bool
    {
        if ($this->scriptPath !== null) {
            return false;
        }

        if (function_exists('app') && app()->environment('testing')) {
            return true;
        }

        return $bundledScript === null && ! is_file((string) $tsx);
    }

    /**
     * @param  array<string, mixed>  $props
     * @return array{html: string, text: string}
     */
    private function fallbackRender(array $props): array
    {
        $lines = [];
        $this->extractStrings($props, $lines);

        $paragraphs = array_map(
            static fn (string $line) => htmlspecialchars($line, ENT_QUOTES, 'UTF-8', false),
            $lines,
        );

        return [
            'html' => '<!DOCTYPE html><html><body><p>'.implode('</p><p>', $paragraphs).'</p></body></html>',
            'text' => implode("\n\n", $lines),
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  list<string>  $lines
     */
    private function extractStrings(array $data, array &$lines): void
    {
        foreach ($data as $value) {
            if (is_string($value) && $value !== '') {
                $lines[] = $value;
            } elseif (is_numeric($value)) {
                $lines[] = (string) $value;
            } elseif (is_array($value)) {
                $this->extractStrings($value, $lines);
            }
        }
    }
}
