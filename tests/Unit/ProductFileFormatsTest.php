<?php

namespace Tests\Unit;

use App\Storefront\ProductFileFormats;
use Tests\TestCase;

class ProductFileFormatsTest extends TestCase
{
    public function testPerKindExtensions(): void
    {
        $this->assertSame(['pdf', 'epub', 'zip', 'txt'], ProductFileFormats::extensions('digital'));
        $this->assertSame(['pdf', 'epub'], ProductFileFormats::extensions('ebook'));
        $this->assertSame(['mp3', 'm4a', 'wav'], ProductFileFormats::extensions('audio'));
    }

    public function testUnionAndCourseFallback(): void
    {
        $union = ['pdf', 'epub', 'zip', 'txt', 'mp3', 'm4a', 'wav'];
        $this->assertSame($union, ProductFileFormats::extensions());
        $this->assertSame($union, ProductFileFormats::extensions('course'));
        $this->assertSame($union, ProductFileFormats::extensions('unknown-kind'));
    }

    public function testHelpText(): void
    {
        $this->assertSame('PDF, EPUB, ZIP, or TXT', ProductFileFormats::helpText('digital'));
        $this->assertSame('PDF or EPUB', ProductFileFormats::helpText('ebook'));
        $this->assertSame('MP3, M4A, or WAV', ProductFileFormats::helpText('audio'));
        $this->assertSame(
            'PDF, EPUB, ZIP, TXT, MP3, M4A, or WAV',
            ProductFileFormats::helpText(),
        );
    }

    public function testAcceptAttribute(): void
    {
        $this->assertSame('.pdf,.epub,.zip,.txt', ProductFileFormats::acceptAttribute('digital'));
        $this->assertSame('.pdf,.epub', ProductFileFormats::acceptAttribute('ebook'));
        $this->assertSame('.mp3,.m4a,.wav', ProductFileFormats::acceptAttribute('audio'));
    }

    public function testUploadMimesExcludeAac(): void
    {
        $this->assertSame(
            [
                'application/pdf',
                'application/epub+zip',
                'application/zip',
                'text/plain',
                'audio/mpeg',
                'audio/mp4',
                'audio/wav',
                'audio/x-wav',
            ],
            ProductFileFormats::uploadMimes(),
        );
        $this->assertNotContains('audio/aac', ProductFileFormats::uploadMimes());
    }

    public function testSellableExtensions(): void
    {
        foreach (['pdf', 'epub', 'zip', 'txt', 'mp3', 'm4a', 'wav'] as $extension) {
            $this->assertTrue(ProductFileFormats::isSellableExtension($extension), $extension);
        }

        $this->assertTrue(ProductFileFormats::isSellableExtension('PDF'));
        $this->assertTrue(ProductFileFormats::isSellableExtension('.mp3'));

        foreach (['aac', 'mobi', 'mp4', 'png', 'jpg', 'csv', '', null] as $extension) {
            $this->assertFalse(
                ProductFileFormats::isSellableExtension($extension),
                var_export($extension, true),
            );
        }
    }

    public function testUploadConfigDerivesFromCapability(): void
    {
        $this->assertSame(
            ProductFileFormats::uploadMimes(),
            config('filesystems.upload_types.digitalProductFiles.defaults.accept'),
        );
    }

    public function testAttachAllowListDerivesFromCapability(): void
    {
        $this->assertSame(
            ProductFileFormats::extensions(),
            config('storefront.allowed_extensions'),
        );
    }

    public function testFrontendPayloadShape(): void
    {
        $payload = ProductFileFormats::forFrontend();

        $this->assertSame(['digital', 'ebook', 'audio', 'course'], array_keys($payload));
        $this->assertSame('.pdf,.epub', $payload['ebook']['accept']);
        $this->assertSame('MP3, M4A, or WAV', $payload['audio']['hint']);
        $this->assertSame(['pdf', 'epub', 'zip', 'txt'], $payload['digital']['extensions']);
    }
}
