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
        $node = $this->nodeBinary ?? 'node';
        $script = $this->scriptPath ?? base_path('scripts/render-email.tsx');
        $tsx = base_path('node_modules/.bin/tsx');

        $command = str_ends_with($script, '.mjs')
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
}