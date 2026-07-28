<?php

namespace App\Actions;

use App\Biolinks\BiolinksQueryBuilder;
use App\Biolinks\Resources\BiolinkResource;
use Common\Core\Bootstrap\BaseBootstrapData;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Resources\WorkspaceResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AppBootstrapData extends BaseBootstrapData
{
    public function init(): self
    {
        parent::init();
        $this->data['linkeableResponse'] = app(Request::class)->route(
            'linkeableResponse',
        );

        if (Auth::check()) {
            $this->data['biolinks'] = BiolinkResource::collection(
                (new BiolinksQueryBuilder([]))->paginate(),
            );
            $this->data['workspaces'] = WorkspaceResource::collection(
                ActiveWorkspace::getAll(),
            );
        }

        $this->data['settings']['unsplash_is_setup'] = config(
            'services.unsplash.access_key',
        );

        return $this;
    }

    protected function getAuthRedirectUri(): string
    {
        $uri = settings('dashboard.homepage', 'links');
        return "/dashboard/$uri";
    }
}
