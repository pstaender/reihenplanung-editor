<?php

declare(strict_types=1);

namespace Reihenplanung;

use InvalidArgumentException;

/**
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
     * @param list<array<string, mixed>> $incoming
     * @return array{revision: int, series: list<array<string, mixed>>}
     */
    public function sync(User $user, int $since, array $incoming): array
    {
        $dir = $this->userDir($user);
        foreach ($incoming as $series) {
            self::validId($series['id'] ?? null);
        }

        return JsonStore::locked($dir . '/_meta.json', function () use ($dir, $since, $incoming): array {
            $meta = JsonStore::read($dir . '/_meta.json', ['revision' => 0]);
            $revision = (int) $meta['revision'];

            foreach ($incoming as $series) {
                $id = self::validId($series['id'] ?? null);
                $file = "{$dir}/{$id}.json";
                $existing = JsonStore::read($file);
                if ($existing !== null && ($existing['updatedAt'] ?? 0) > ($series['updatedAt'] ?? 0)) {
                    continue; // Server hat die neuere Version
                }
                $revision = max($revision + 1, (int) floor(microtime(true) * 1000));
                $series['_rev'] = $revision;
                JsonStore::write($file, $series);
            }

            if ($revision !== (int) $meta['revision']) {
                JsonStore::write($dir . '/_meta.json', ['revision' => $revision]);
            }

            $changed = array_values(array_filter(
                $this->all($dir),
                fn (array $s) => ($s['_rev'] ?? 0) > $since,
            ));

            return ['revision' => $revision, 'series' => $changed];
        });
    }

    /** @return list<array<string, mixed>> */
    public function list(User $user): array
    {
        return $this->all($this->userDir($user));
    }

    /** @return array<string, mixed>|null */
    public function find(User $user, string $id): ?array
    {
        return JsonStore::read($this->userDir($user) . '/' . self::validId($id) . '.json');
    }

    /** @return list<array<string, mixed>> */
    private function all(string $dir): array
    {
        $files = glob($dir . '/*.json') ?: [];
        $series = [];
        foreach ($files as $file) {
            if (basename($file) !== '_meta.json') {
                $series[] = JsonStore::read($file);
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
