<?php

namespace Common\Auth\Actions;

use App\Models\User;
use Common\Database\Datasource\Datasource;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\AbstractPaginator;
use Illuminate\Support\Arr;

class PaginateUsers
{
    public function execute(array $params): AbstractPaginator
    {
        $query = User::with(['roles', 'permissions']);

        return (new Datasource($query, $params))->paginate();
    }
}
