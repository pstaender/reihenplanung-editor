<?php

declare(strict_types=1);

namespace Reihenplanung;

use InvalidArgumentException;

/**
 * Reihen werden als stdClass-Objekte behandelt (nicht als assoziative Arrays), damit
 * leere JSON-Objekte wie `"cells": {}` beim Speichern nicht zu `[]` werden.
 *
 * Jede Unterrichtsreihe liegt als eigene Datei unter data/series/<user-id>/<series-uuid>.json.
 *
 * Jede gespeicherte Reihe erhält eine serverseitige, monoton steigende Revision (`_rev`).
 * Clients merken sich die zuletzt gesehene Revision und bekommen beim nächsten Sync nur Neueres.
 */
final class SeriesRepository
{
    public function __construct(private readonly Config $config)
    {
    }

    /**
     * Last-write-wins anhand von `updatedAt` (vom Client gesetzter Zeitstempel in ms).
     *
     * @param list<object> $incoming
     * @return array{revision: int, series: list<object>}
     */
    public function sync(User $user, int $since, array $incoming): array
    {
        $dir = $this->userDir($user);
        foreach ($incoming as $series) {
            self::validId($series->id ?? null);
        }

        return JsonStore::locked($dir . '/_meta.json', function () use ($dir, $since, $incoming): array {
            $meta = JsonStore::read($dir . '/_meta.json', ['revision' => 0]);
            $revision = (int) $meta['revision'];

            foreach ($incoming as $series) {
                $id = self::validId($series->id ?? null);
                $file = "{$dir}/{$id}.json";
                $existing = JsonStore::read($file, associative: false);
                if ($existing !== null && ($existing->updatedAt ?? 0) > ($series->updatedAt ?? 0)) {
                    continue; // Server hat die neuere Version
                }
                $revision = max($revision + 1, (int) floor(microtime(true) * 1000));
                $series->_rev = $revision;
                JsonStore::write($file, $series);
            }

            if ($revision !== (int) $meta['revision']) {
                JsonStore::write($dir . '/_meta.json', ['revision' => $revision]);
            }

            $changed = array_values(array_filter(
                $this->all($dir),
                fn (object $s) => ($s->_rev ?? 0) > $since,
            ));

            return ['revision' => $revision, 'series' => $changed];
        });
    }

    /** @return list<object> */
    public function list(User $user): array
    {
        return $this->all($this->userDir($user));
    }

    public function find(User $user, string $id): ?object
    {
        return JsonStore::read($this->userDir($user) . '/' . self::validId($id) . '.json', associative: false);
    }

    /** @return list<object> */
    private function all(string $dir): array
    {
        $files = glob($dir . '/*.json') ?: [];
        $series = [];
        foreach ($files as $file) {
            if (basename($file) !== '_meta.json') {
                $series[] = JsonStore::read($file, associative: false);
            }
        }

        return $series;
    }

    private function userDir(User $user): string
    {
        return $this->config->dataDir . '/series/' . self::validId($user->id);
    }

    private static function validId(mixed $id): string
    {
        if (!is_string($id) || !Uuid::isValid($id)) {
            throw new InvalidArgumentException('Ungültige ID (UUID erwartet)');
        }

        return strtolower($id);
    }
}
