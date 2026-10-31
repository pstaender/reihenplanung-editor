<?php

declare(strict_types=1);

use Reihenplanung\Config;
use Reihenplanung\Http\Api;
use Reihenplanung\Http\Request;

// PHP-Entwicklungsserver: vorhandene statische Dateien (z. B. assets/) direkt ausliefern
if (PHP_SAPI === 'cli-server') {
    $file = __DIR__ . parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
    if ($file !== __FILE__ && is_file($file)) {
        return false;
    }
}

require dirname(__DIR__) . '/vendor/autoload.php';

$request = Request::fromGlobals();

// Gebautes Frontend (build_for_production.sh) unter „/“ ausliefern
$frontend = __DIR__ . '/index.html';
if ($request->method === 'GET' && $request->path === '/' && is_file($frontend)) {
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache');
    readfile($frontend);
    exit;
}

(new Api(Config::fromEnvironment()))->handle($request)->send();
