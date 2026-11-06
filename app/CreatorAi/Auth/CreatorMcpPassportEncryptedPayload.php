<?php

namespace App\CreatorAi\Auth;

use Illuminate\Contracts\Encryption\Encrypter;
use Laravel\Passport\Passport;
use League\OAuth2\Server\CryptTrait;
use Throwable;

/** Decode League OAuth encrypted code/refresh metadata, never persist plaintext. */
final class CreatorMcpPassportEncryptedPayload
{
    use CryptTrait;

    public function __construct(Encrypter $encrypter)
    {
        $this->setEncryptionKey(Passport::tokenEncryptionKey($encrypter));
    }

    /** @return array<string,mixed> */
    public function decode(string $encrypted): array
    {
        abort_unless($encrypted !== '' && strlen($encrypted) <= 8192, 403);

        try {
            $value = json_decode($this->decrypt($encrypted), true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            abort(403, 'Invalid OAuth credentials.');
        }

        abort_unless(is_array($value), 403);

        return $value;
    }
}
