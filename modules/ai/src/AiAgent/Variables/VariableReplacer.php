<?php

namespace Ai\AiAgent\Variables;

use Ai\AiAgent\Models\AiAgentSession;
use Ai\AiAgent\Models\AiAgentTool;
use Ai\AiAgent\Tools\UsesToolResponseData;
use Ai\AiAgent\Variables\VariableReplacerData;
use App\Conversations\Models\Conversation;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Locale;

class VariableReplacer
{
    use UsesToolResponseData;

    public static $regex = '/<be-variable name="([a-zA-Z0-9_-]+)" type="([a-zA-Z0-9_-]+)" fallback="(([a-zA-Z0-9_-]+)?)"><\/be-variable>/i';

    public function __construct(protected VariableReplacerData $data) {}

    public function execute(string $text = '', int|null $itemIndex = null)
    {
        return preg_replace_callback(
            self::$regex,
            function ($matches) use ($itemIndex) {
                $value = $this->replaceVariable(
                    [
                        'name' => $matches[1],
                        'type' => $matches[2],
                        'fallback' => $matches[3],
                    ],
                    $itemIndex,
                );

                return is_array($value) ? json_encode($value) : $value;
            },
            $text,
        );
    }

    protected function replaceVariable(
        array $variable,
        int|null $itemIndex = null,
    ) {
        $name = $variable['name'];
        $type = $variable['type'];
        $fallback =
            $variable['fallback'] === 'null' || !$variable['fallback']
                ? null
                : $variable['fallback'];

        $value = null;

        if (!empty($this->data->attributes)) {
            $attribute = Arr::first(
                $this->data->attributes,
                fn($a) => $a['type'] === $type && $a['name'] === $name,
            );
            if (isset($attribute['value'])) {
                $value = $attribute['value'];
            }
        }

        if (
            !$value &&
            $type === Conversation::MODEL_TYPE &&
            $this->data->conversation
        ) {
            $value = $this->findMatchingAttributeOnModel(
                $this->data->conversation,
                $name,
            );
        }

        if (
            !$value &&
            $type === AiAgentSession::MODEL_TYPE &&
            $this->data->session
        ) {
            $value = $this->findMatchingAttributeOnModel(
                $this->data->session,
                $name,
            );
        }

        if (!$value && $type === User::MODEL_TYPE && $this->data->user) {
            $value = $this->findMatchingAttributeOnUser(
                $this->data->user,
                $name,
            );
        }

        if (!$value && $type === AiAgentTool::MODEL_TYPE && $this->data->tool) {
            $value = $this->findMatchingPropertyOnToolResponse(
                $name,
                $itemIndex,
            );
        }

        return $value ?: ($fallback ?: $name);
    }

    protected function findMatchingAttributeOnModel($model, string $name)
    {
        $attribute = $model->customAttributes->where('key', $name)->first();

        return $attribute?->value ?? $model->{$name};
    }

    protected function findMatchingAttributeOnUser(User $user, string $name)
    {
        if ($name === 'signedUp') {
            $value =
                $user->customAttributes->where('key', 'signed_up_at')->first()
                    ?->value ?? $user->created_at;
            if ($value) {
                return Carbon::parse($value)->diffInDays(now());
            }
        }

        $value =
            $this->findMatchingAttributeOnModel($user, $name) ??
            $user->latestUserSession->{$name};

        if ($name === 'country' && $value) {
            return Locale::getDisplayRegion($value);
        }

        if ($name === 'language' && $value) {
            return Locale::getDisplayLanguage($value);
        }

        return $value;
    }

    protected function findMatchingPropertyOnToolResponse(
        string $propertyId,
        int|null $itemIndex = null,
    ): string|null {
        if (!$this->data->toolResponse || !$this->data->tool) {
            return null;
        }

        $propertyPath =
            Arr::first(
                $this->data->tool->response_schema['properties'],
                fn($property) => $property['id'] === $propertyId,
            )['path'] ?? null;
        if (!$propertyPath) {
            return null;
        }

        $realPath = $this->getRealPropertyPath($propertyPath, $itemIndex);

        $data = Arr::get($this->data->toolResponse, $realPath);

        return $data ? (string) $data : null;
    }
}
