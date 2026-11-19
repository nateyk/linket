<?php

use Symfony\Component\Process\Process;

test('artisan bootstrap does not register a shutdown handler that dumps nonfatal warnings', function () {
    $source = file_get_contents(base_path('artisan'));

    expect($source)->not->toContain("register_shutdown_function('fatal_handler')");
});

test('the Chapa route list completes without dumping a PHP error array', function () {
    $process = new Process([PHP_BINARY, 'artisan', 'route:list', '--path=chapa'], base_path());
    $process->setTimeout(30);
    $process->run();

    expect($process->getExitCode())->toBe(0, $process->getErrorOutput())
        ->and($process->getOutput())->toContain('billing/chapa')
        ->and($process->getOutput())->not->toContain('class_parents(): Class web does not exist')
        ->and($process->getOutput())->not->toContain('array(4)');
});
