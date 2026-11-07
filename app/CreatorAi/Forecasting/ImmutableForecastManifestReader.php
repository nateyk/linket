<?php

namespace App\CreatorAi\Forecasting;

/**
 * A read-only source for one externally stored, version-pinned, immutable
 * closed-window manifest. No method permits writing or deleting an object.
 */
interface ImmutableForecastManifestReader
{
    /**
     * @return array{body:string,version_id:string,sha256:string,retention_verified:bool}
     */
    public function readVersion(string $key, string $versionId): array;
}
