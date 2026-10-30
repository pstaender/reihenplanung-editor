<?php

declare(strict_types=1);

use Reihenplanung\Config;
use Reihenplanung\Http\Api;
use Reihenplanung\Http\Request;

require dirname(__DIR__) . '/vendor/autoload.php';

(new Api(Config::fromEnvironment()))->handle(Request::fromGlobals())->send();
