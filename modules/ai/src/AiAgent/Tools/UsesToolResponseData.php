<?php

namespace Ai\AiAgent\Tools;

use Ai\AiAgent\Models\ToolResponse;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

trait UsesToolResponseData
{
    protected function getRealListPath(string $listPath): string
    {
        return Str::of($listPath)
            ->replace('[root]', '')
            ->replace('[*]', '0')
            ->trim('.')
            ->toString();
    }

    protected function getRealPropertyPath(
        string $propertyPath,
        int $propertyIndex = 0,
    ): string {
        $propertyPath = Str::of($propertyPath)
            ->replace('[root]', '')
            ->replaceFirst('[*]', $propertyIndex)
            ->trim('.')
            ->toString();

        return $propertyPath;
    }

    protected function getPropertyValue(
        ToolResponse $response,
        string $propertyPath,
    ) {
        return Arr::get(
            $response->getAsJson(),
            $this->getRealPropertyPath($propertyPath),
        );
    }
}
