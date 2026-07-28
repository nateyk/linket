<?php

namespace Common\Notifications\Resources;

use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Notifications\DatabaseNotification;

/**
 * @mixin DatabaseNotification
 */
#[SchemaName('Notification')]
class NotificationResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            /**
             * @var array{
             *         image: string,
             *         warning?: bool,
             *         mainAction?: array{
             *             label: string,
             *             action: string,
             *             emitOnly?: bool,
             *             color?: null|'primary'|'secondary'|'danger'|'positive'
             *         },
             *         buttonActions?: array<int, array{
             *             label: string,
             *             action: string,
             *             emitOnly?: bool,
             *             color?: null|'primary'|'secondary'|'danger'|'positive'
             *         }>,
             *         lines: array<int, array{
             *             content: string,
             *             icon?: string,
             *             type?: 'secondary'|'primary',
             *             action?: array{
             *                 label: string,
             *                 action: string,
             *                 emitOnly?: bool,
             *                 color?: null|'primary'|'secondary'|'danger'|'positive'
             *             }
             *         }>
             *     }
             */
            'data' => $this->data,
            'read_at' => $this->read_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
