<?php

namespace Tests\Unit;

use Common\Websockets\GetWebsocketCredentialsForClient;
use Tests\TestCase;

class GetWebsocketCredentialsForClientTest extends TestCase
{
    public function test_returns_null_when_websockets_flag_is_off(): void
    {
        config()->set('app.websockets_integrated', false);
        config()->set('broadcasting.default', 'reverb');
        config()->set('broadcasting.connections.reverb.key', 'test-key');

        $this->assertNull((new GetWebsocketCredentialsForClient())->execute());
    }

    public function test_returns_reverb_credentials_when_flag_is_on(): void
    {
        config()->set('app.websockets_integrated', true);
        config()->set('broadcasting.default', 'reverb');
        config()->set('broadcasting.connections.reverb.key', 'test-key');
        config()->set('broadcasting.connections.reverb.options.host', 'localhost');
        config()->set('broadcasting.connections.reverb.options.port', 8080);
        config()->set('broadcasting.connections.reverb.options.scheme', 'http');

        $this->assertSame(
            [
                'driver' => 'reverb',
                'key' => 'test-key',
                'host' => 'localhost',
                'port' => 8080,
                'scheme' => 'http',
            ],
            (new GetWebsocketCredentialsForClient())->execute(),
        );
    }
}
