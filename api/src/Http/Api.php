<?php

declare(strict_types=1);

namespace Reihenplanung\Http;

use InvalidArgumentException;
use Reihenplanung\Config;
use Reihenplanung\SeriesRepository;
use Reihenplanung\User;
use Reihenplanung\UserRepository;
use Throwable;

/**
 * Endpunkte:
 *   GET  /me            → angemeldeter Benutzer (Token-Test)
 *   POST /sync          → { since, series: [...] }  ⇒  { revision, series: [...] }
 *   GET  /series        → alle Reihen
 *   GET  /series/{id}   → eine Reihe
 */
final class Api
{
    private const MAX_BODY_BYTES = 10 * 1024 * 1024;

    private readonly UserRepository $users;
    private readonly SeriesRepository $series;

    public function __construct(private readonly Config $config)
    {
        $this->users = new UserRepository($config);
        $this->series = new SeriesRepository($config);
    }

    public function handle(Request $request): Response
    {
        $cors = [
            'Access-Control-Allow-Origin' => $this->config->corsOrigin,
            'Access-Control-Allow-Methods' => 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers' => 'Authorization, Content-Type',
            'Access-Control-Max-Age' => '86400',
            'Vary' => 'Origin',
        ];

        try {
            $response = $request->method === 'OPTIONS'
                ? new Response(204)
                : $this->route($request);
        } catch (HttpException $e) {
            $response = Response::error($e->status, $e->getMessage());
        } catch (InvalidArgumentException $e) {
            $response = Response::error(400, $e->getMessage());
        } catch (Throwable $e) {
            error_log((string) $e);
            $response = Response::error(500, 'Interner Serverfehler');
        }

        return new Response($response->status, $response->data, [...$cors, ...$response->headers]);
    }

    private function route(Request $request): Response
    {
        $user = $this->authenticate($request);

        return match (true) {
            $request->method === 'GET' && $request->path === '/me' => Response::json(['email' => $user->email]),
            $request->method === 'POST' && $request->path === '/sync' => $this->sync($request, $user),
            $request->method === 'GET' && $request->path === '/series' => Response::json(['series' => $this->series->list($user)]),
            $request->method === 'GET' && preg_match('#^/series/([0-9a-f-]{36})$#i', $request->path, $m) === 1
                => Response::json($this->series->find($user, $m[1]) ?? throw new HttpException(404, 'Reihe nicht gefunden')),
            default => throw new HttpException(404, 'Unbekannter Endpunkt'),
        };
    }

    private function authenticate(Request $request): User
    {
        $token = $request->bearerToken() ?? throw new HttpException(401, 'Kein API-Token angegeben');

        return $this->users->authenticate($token) ?? throw new HttpException(401, 'Ungültiges API-Token');
    }

    private function sync(Request $request, User $user): Response
    {
        if (strlen($request->body) > self::MAX_BODY_BYTES) {
            throw new HttpException(413, 'Anfrage zu groß');
        }
        $data = $request->json();
        $incoming = $data->series ?? [];
        if (!is_array($incoming)) {
            throw new HttpException(400, '"series" muss eine Liste sein');
        }
        foreach ($incoming as $series) {
            if (!is_object($series)) {
                throw new HttpException(400, 'Jede Reihe muss ein Objekt sein');
            }
        }

        return Response::json($this->series->sync($user, (int) ($data->since ?? 0), $incoming));
    }
}
