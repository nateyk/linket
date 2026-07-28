<?php

namespace Common\API;

use Attribute;

#[Attribute(Attribute::TARGET_METHOD)]
class ExcludeRouteFromPublicDocs {}
