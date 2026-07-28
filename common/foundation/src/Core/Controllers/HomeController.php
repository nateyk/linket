<?php

namespace Common\Core\Controllers;

use Common\Core\Rendering\RendersClientSideApp;
use Illuminate\Routing\Controller;

class HomeController extends Controller
{
    use RendersClientSideApp;

    /**
     * Render basic client side page when page has no data or seo tags.
     * (contact page, login, register, etc.)
     */
    public function render()
    {
        return $this->clientSideOrPrerenderedResponse([]);
    }
}
