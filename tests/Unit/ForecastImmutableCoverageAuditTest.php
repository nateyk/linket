<?php

use App\CreatorAi\Forecasting\ForecastImmutableCoverageAudit;
use App\CreatorAi\Forecasting\ImmutableForecastManifestReader;
use App\Models\User;

test('the external immutable auditor is not a public controller or any write-capable service', function () {
    $readerMethods = array_map(
        static fn ($method) => $method->getName(),
        (new ReflectionClass(ImmutableForecastManifestReader::class))->getMethods()
    );
    expect($readerMethods)->toBe(['readVersion']);
    $auditMethods = array_map(
        static fn ($method) => $method->getName(),
        (new ReflectionClass(ForecastImmutableCoverageAudit::class))->getMethods(ReflectionMethod::IS_PUBLIC)
    );
    expect($auditMethods)->toBe(['__construct', 'inspect']);
});

test('the immutable evidence audit class cannot be used as a payment mutation or MCP tool', function () {
    expect(class_exists(ForecastImmutableCoverageAudit::class))->toBeTrue()
        ->and(is_subclass_of(ForecastImmutableCoverageAudit::class, \Illuminate\Routing\Controller::class))->toBeFalse()
        ->and(config('creator_ai.forecast_evidence.enabled', false))->toBeFalse();
});
