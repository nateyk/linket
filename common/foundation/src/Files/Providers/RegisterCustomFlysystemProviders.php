<?php

namespace Common\Files\Providers;

use Illuminate\Filesystem\FilesystemManager;
use Illuminate\Support\Facades\Storage;
use League\Flysystem\WebDAV\WebDAVAdapter;
use Sabre\DAV\Client;
use League\Flysystem\Filesystem as Flysystem;
use Illuminate\Filesystem\FilesystemAdapter;
use League\Flysystem\FilesystemAdapter as FlysystemAdapter;
use League\Flysystem\PathPrefixing\PathPrefixedAdapter;

class RegisterCustomFlysystemProviders
{
    public function execute()
    {
        $this->digitalOcean();
        $this->backblaze();
        $this->webdav();
    }

    protected function digitalOcean()
    {
        Storage::extend('digitalocean', function ($app, $config) {
            $config[
                'endpoint'
            ] = "https://{$config['region']}.digitaloceanspaces.com";

            return app(FilesystemManager::class)->createS3Driver($config);
        });
    }

    public function backblaze()
    {
        Storage::extend('backblaze', function ($app, $config) {
            $config[
                'endpoint'
            ] = "https://s3.{$config['region']}.backblazeb2.com";

            return app(FilesystemManager::class)->createS3Driver($config);
        });
    }

    public function webdav()
    {
        Storage::extend('webdav', function ($app, $config) {
            $client = new Client([
                'baseUri' => $config['baseUri'] ?? $config['url'],
                'userName' => $config['userName'] ?? $config['username'],
                'password' => $config['password'],
            ]);
            $adapter = new WebDAVAdapter($client);

            return $this->createFlysystem($adapter, $config);
        });
    }

    protected function createFlysystem(FlysystemAdapter $adapter, array $config)
    {
        if (!empty($config['prefix'])) {
            $adapter = new PathPrefixedAdapter($adapter, $config['prefix']);
        }

        return new FilesystemAdapter(
            new Flysystem($adapter, $config),
            $adapter,
            $config,
        );
    }
}
