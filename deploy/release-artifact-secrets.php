<?php

declare(strict_types=1);

/**
 * Standalone, nonexecuting content scan. Never bootstrap Laravel or log contents.
 *
 * @param resource $stream
 */
function containsSigningKey(mixed $stream, ?int $remaining = null): bool
{
    $carry = '';
    $found = false;
    $pending = false;
    // OpenSSL's PEM reader tolerates control and high-bit padding bytes too.
    $padding = "\x00..\x20\x7f..\xff";
    while ($remaining !== 0 && ! feof($stream)) {
        $chunk = fread($stream, $remaining === null ? 65536 : min(65536, $remaining));
        if ($chunk === false || ($chunk === '' && $remaining !== null)) {
            throw new RuntimeException('Cannot read artifact content.');
        }
        $window = $carry.$chunk;
        $text = str_replace(['\\r\\n', '\\n'], "\n", $window);
        // Track whitespace across chunks: OpenSSL accepts short base64 lines and
        // arbitrarily padded header lines. Quoted library format strings have a
        // quote or placeholder after the separator instead of encoded key data.
        if ($pending) {
            // Carry can start inside the old header. Pending state consumes only
            // new bytes, so truncating the lookbehind cannot clear that state.
            $tail = ltrim(str_replace(['\\r\\n', '\\n'], "\n", $chunk), $padding);
            if ($tail !== '') {
                $found = $found || strspn($tail[0], 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=') === 1;
                $pending = false;
            }
        }
        $match = preg_match_all('/-----BEGIN (?:[A-Z0-9]{1,32} ){0,4}(?:PRIVATE|PUBLIC) KEY-----/', $text, $headers, PREG_OFFSET_CAPTURE);
        if ($match === false) {
            throw new RuntimeException('Cannot inspect key material.');
        }
        foreach ($headers[0] as [$header, $offset]) {
            $suffix = substr($text, $offset + strlen($header));
            if ($suffix !== '' && (ord($suffix[0]) <= 32 || ord($suffix[0]) >= 127)) {
                $tail = ltrim($suffix, $padding);
                if ($tail === '') {
                    $pending = true;
                } else {
                    $found = $found || strspn($tail[0], 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=') === 1;
                }
            }
        }
        $carry = substr($window, -1024);
        if ($remaining !== null) {
            $remaining -= strlen($chunk);
        }
    }
    if ($remaining !== null && $remaining !== 0) {
        throw new RuntimeException('Truncated archive content.');
    }

    return $found;
}

/** @param resource $stream */
function checkTarStream(mixed $stream): void
{
    // This is a conservative raw type/size audit, alongside GNU tar's independent
    // checksum and resolved-name validation. Only the producer's GNU/USTAR subset
    // is supported. PAX, sparse, dumpdir, links and other extensions fail closed.
    $count = 0;
    while (! feof($stream)) {
        $header = '';
        while (strlen($header) < 512 && ! feof($stream)) {
            $chunk = fread($stream, 512 - strlen($header));
            if ($chunk === false) {
                throw new RuntimeException('Cannot read tar header.');
            }
            $header .= $chunk;
        }
        if ($header === '') {
            break;
        }
        if (strlen($header) !== 512) {
            throw new RuntimeException('Truncated tar header.');
        }
        if ($header === str_repeat("\0", 512)) {
            continue;
        }
        if (++$count > 250000 || ! in_array($header[156], ["\0", '0', '5', 'L'], true)) {
            throw new RuntimeException('Unsupported tar entry type.');
        }
        $sizeField = trim(substr($header, 124, 12), "\0 ");
        if (! preg_match('/^[0-7]{1,11}$/D', $sizeField)) {
            throw new RuntimeException('Unsupported tar size encoding.');
        }
        $size = (int) octdec($sizeField);
        if ($header[156] === '5' && $size !== 0) {
            throw new RuntimeException('Directory entries cannot carry content.');
        }
        if (containsSigningKey($stream, $size)) {
            throw new RuntimeException('Signing key material is forbidden.');
        }
        $padding = (512 - $size % 512) % 512;
        if ($padding > 0 && strlen(fread($stream, $padding)) !== $padding) {
            throw new RuntimeException('Truncated tar padding.');
        }
    }
}

set_error_handler(static function (): never {
    throw new RuntimeException('Artifact content scan failed.');
});

try {
    if ($argc === 2 && $argv[1] === '--check-tar-stream') {
        checkTarStream(STDIN);
    } elseif ($argc === 3 && in_array($argv[1], ['--release-sha', '--ci-meta'], true)) {
        $sha = $argv[2];
        $content = stream_get_contents(STDIN, 4097);
        if (! preg_match('/^[a-f0-9]{40}$/D', $sha) || $content === false || strlen($content) > 4096) {
            throw new RuntimeException('Invalid release metadata.');
        }
        if ($argv[1] === '--release-sha') {
            if (! in_array($content, [$sha, $sha."\n"], true)) {
                throw new RuntimeException('Release SHA mismatch.');
            }
        } else {
            $lines = explode("\n", str_ends_with($content, "\n") ? substr($content, 0, -1) : $content);
            if (count($lines) > 2 || count(array_filter($lines, static fn (string $line): bool => $line === 'CI_SHA='.$sha)) !== 1) {
                throw new RuntimeException('CI metadata SHA mismatch.');
            }
            foreach ($lines as $line) {
                if ($line !== 'CI_SHA='.$sha && ! preg_match('/^CI_RELEASE_ID=[0-9]{8}-[0-9]{6}-'.substr($sha, 0, 7).'$/D', $line)) {
                    throw new RuntimeException('Unexpected CI metadata.');
                }
            }
        }
    } elseif ($argc === 3 && $argv[1] === '--exclusions') {
        $source = realpath($argv[2]);
        if ($source === false || ! is_dir($source)) {
            throw new RuntimeException('Missing packaging source.');
        }
        $directory = new RecursiveDirectoryIterator($source, FilesystemIterator::SKIP_DOTS);
        $filter = new RecursiveCallbackFilterIterator($directory, static function (SplFileInfo $entry) use ($source): bool {
            $relative = substr($entry->getPathname(), strlen($source) + 1);
            if (preg_match('~^(?:\.git|node_modules|storage|shared|keys|secrets|\.ddev|\.agents|\.superpowers|\.cursor|public/storage|bootstrap/cache)(?:/|$)~', $relative)) {
                return false;
            }
            if (preg_match('/[\x00-\x1f\x7f\\\\]/', $relative)) {
                throw new RuntimeException('Unsafe source filename.');
            }
            if ($entry->isLink() || (! $entry->isDir() && ! $entry->isFile())) {
                throw new RuntimeException('Links and special files are forbidden in packaging sources.');
            }

            return true;
        });
        foreach (new RecursiveIteratorIterator($filter) as $entry) {
            if (lstat($entry->getPathname())['nlink'] !== 1) {
                throw new RuntimeException('Hardlinks are forbidden in packaging sources.');
            }
            $stream = fopen($entry->getPathname(), 'rb');
            $containsKey = containsSigningKey($stream);
            fclose($stream);
            if ($containsKey) {
                // Silently removing application source could break autoload/boot.
                if (in_array(strtolower($entry->getExtension()), ['php', 'phar'], true)) {
                    throw new RuntimeException('Signing keys must be removed from executable source before packaging.');
                }
                echo './'.substr($entry->getPathname(), strlen($source) + 1)."\n";
            }
        }
    } else {
        throw new RuntimeException('Usage: release-artifact-secrets.php --check-tar-stream | --exclusions <source>');
    }
} catch (Throwable) {
    // Filesystem and parser messages can include values supplied by an archive.
    fwrite(STDERR, "SECURITY GATE: artifact signing-key scan failed; no credential values logged.\n");
    exit(1);
}
