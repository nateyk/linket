<?php

namespace App\Actions;

use App\Biolinks\BiolinksQueryBuilder;
use App\Stores\Resources\StoreResource;
use App\Storefront\ProductFileFormats;
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
            $this->data['stores'] = StoreResource::collection(
                (new BiolinksQueryBuilder([]))->paginate(),
            );
            $this->data['biolinks'] = $this->data['stores'];
            $this->data['workspaces'] = WorkspaceResource::collection(
                ActiveWorkspace::getAll(),
            );
        }

        $this->data['settings']['unsplash_is_setup'] = config(
            'services.unsplash.access_key',
        );

        // Canonical creator-sellable file formats for the product form.
        $this->data['product_file_formats'] = ProductFileFormats::forFrontend();

        return $this;
    }

    protected function getAuthRedirectUri(): string
    {
        return '/dashboard';
    }
}
