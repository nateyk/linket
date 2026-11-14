<?php

namespace App\Analytics\QueryBuilder;

use App\Biolinks\Models\Biolink;
use App\Stores\Models\Store;
use App\Links\Models\Link;
use App\QrCodes\Models\QrCode;
use App\Analytics\Models\TrackedEvent;
use Common\Database\QueryBuilder\BaseQueryBuilder;
use Common\Database\QueryBuilder\Filter;
use Illuminate\Database\Eloquent\Builder;

class TrackedEventsQueryBuilder extends BaseQueryBuilder
{
    protected string $model = TrackedEvent::class;

    protected function defaultSort(): array
    {
        return ['created_at' => 'desc'];
    }

    public function __construct(
        protected array $params,
        protected bool $shouldSort = false,
    ) {
        parent::__construct($this->params);
    }

    public function shouldScopeToWorkspace()
    {
        return true;
    }

    public function getBaseBuilder(): Builder
    {
        return TrackedEvent::query()
            ->with('linkeable')
            ->where('crawler', false);
    }

    protected function applySorting(): void
    {
        if ($this->shouldSort) {
            parent::applySorting();
        }
    }

    protected function sortableFields(): array
    {
        return ['id', 'created_at'];
    }

    protected function applyFilter(Filter $filter): Builder
    {
        return match ($filter->key) {
            'user_id',
            'device',
            'platform',
            'location',
            'domain_id',
            'event_type',
            'linkeable_type',
            'created_at'
                => $this->simpleFilter($filter),
            'city', 'state', 'browser' => $this->stringFilter($filter),
            'link_id', 'biolink_id', 'qr_code_id' => $this->linkeableFilter(
                $filter,
            ),
            'folder_id' => $this->folderFilter($filter),
        };
    }

    protected function folderFilter(Filter $filter): Builder
    {
        $linkIds = Link::query()
            ->where('folder_id', $filter->value)
            ->pluck('id');

        return $this->builder
            ->where('linkeable_type', Link::MODEL_TYPE)
            ->whereIn('linkeable_id', $linkIds);
    }

    protected function linkeableFilter(Filter $filter): Builder
    {
        return match ($filter->key) {
            'link_id' => $this->builder
                ->where('linkeable_id', $filter->value)
                ->where('linkeable_type', Link::MODEL_TYPE),
            'biolink_id' => $this->builder
                ->where('linkeable_id', $filter->value)
                ->whereIn('linkeable_type', [
                    Biolink::MODEL_TYPE,
                    Store::MODEL_TYPE,
                    Biolink::class,
                    Store::class,
                ]),
            'qr_code_id' => $this->builder
                ->where('linkeable_id', $filter->value)
                ->where('linkeable_type', QrCode::MODEL_TYPE),
        };
    }
}
