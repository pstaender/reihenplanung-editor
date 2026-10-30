<?php

declare(strict_types=1);

namespace Reihenplanung\Http;

use JsonException;

final readonly class Request
{
    /** @param array<string, string> $headers */
    public function __construct(
        public string $method,
        public string $path,
        public array $headers,
        public string $body,
    ) {
    }

    public static function fromGlobals(): self
    {
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        // Funktioniert sowohl unter / als auch in einem Unterverzeichnis (…/index.php/sync oder …/api/sync)
        $script = $_SERVER['SCRIPT_NAME'] ?? '';
        if ($script !== '' && str_starts_with($path, $script)) {
            $path = substr($path, strlen($script));
        } elseif (($base = rtrim(dirname($script), '/')) !== '' && str_starts_with($path, $base)) {
            $path = substr($path, strlen($base));
        }

        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $headers[strtolower(str_replace('_', '-', substr($key, 5)))] = (string) $value;
            }
        }
        // Apache reicht Authorization teilweise nur so durch
        if (!isset($headers['authorization']) && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $headers['authorization'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }

        return new self(
            strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET'),
            '/' . trim($path, '/'),
            $headers,
            file_get_contents('php://input') ?: '',
        );
    }

    public function bearerToken(): ?string
    {
        $header = $this->headers['authorization'] ?? '';
        if (preg_match('/^Bearer\s+(\S+)$/i', $header, $m) === 1) {
            return $m[1];
        }

        return null;
    }

    /** @return array<string, mixed> */
    public function json(): array
    {
        try {
            $data = json_decode($this->body, true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new HttpException(400, 'Ungültiges JSON');
        }
        if (!is_array($data)) {
            throw new HttpException(400, 'JSON-Objekt erwartet');
        }

        return $data;
    }
}
