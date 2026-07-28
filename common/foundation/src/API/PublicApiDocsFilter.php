<?php

namespace Common\API;

use Dedoc\Scramble\Support\Generator\OpenApi;
use Illuminate\Routing\Route;
use ReflectionClass;
use ReflectionMethod;

class PublicApiDocsFilter
{
    public static function shouldExcludeRoute(Route $route): bool
    {
        $uses = $route->getAction('uses');

        if (! is_string($uses) || ! str_contains($uses, '@')) {
            return false;
        }

        [$class, $method] = explode('@', $uses, 2);

        $reflectionClass = new ReflectionClass($class);

        if ($reflectionClass->getAttributes(ExcludeRoutesFromPublicDocs::class)) {
            return true;
        }

        if (
            $method
            && $reflectionClass->hasMethod($method)
        ) {
            $reflectionMethod = new ReflectionMethod($class, $method);

            if ($reflectionMethod->getAttributes(ExcludeRouteFromPublicDocs::class)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  list<string>  $excludedTags
     */
    public static function removeExcludedOperations(
        OpenApi $document,
        array $excludedTags,
    ): void {
        $document->paths = array_values(
            array_filter(
                array_map(function ($path) use ($excludedTags) {
                    foreach ($path->operations as $method => $operation) {
                        $hasExcludedTag = collect($operation->tags)
                            ->map(fn ($tag) => trim($tag))
                            ->intersect($excludedTags)
                            ->isNotEmpty();

                        if ($hasExcludedTag) {
                            unset($path->operations[$method]);
                        }
                    }

                    return count($path->operations) ? $path : null;
                }, $document->paths),
            ),
        );
    }
}
