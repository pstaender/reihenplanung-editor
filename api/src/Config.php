<?php

declare(strict_types=1);

namespace Reihenplanung;

final readonly class Config
{
    public function __construct(
        public string $dataDir,
        public string $corsOrigin,
    ) {
    }

    public static function fromEnvironment(): self
    {
        $dataDir = getenv('REIHENPLANUNG_DATA_DIR') ?: dirname(__DIR__) . '/data';
        $corsOrigin = getenv('REIHENPLANUNG_CORS_ORIGIN') ?: '*';

        return new self(rtrim($dataDir, '/'), $corsOrigin);
    }
}
