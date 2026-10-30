<?php

declare(strict_types=1);

namespace Reihenplanung;

use RuntimeException;

/**
 * Liest und schreibt JSON-Dateien atomar (Schreiben in temporäre Datei + rename).
 */
final class JsonStore
{
    public static function read(string $file, mixed $default = null): mixed
    {
        if (!is_file($file)) {
            return $default;
        }
        $content = file_get_contents($file);
        if ($content === false) {
            throw new RuntimeException("Datei kann nicht gelesen werden: {$file}");
        }

        return json_decode($content, true, flags: JSON_THROW_ON_ERROR);
    }

    public static function write(string $file, mixed $data): void
    {
        $dir = dirname($file);
        if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
            throw new RuntimeException("Verzeichnis kann nicht angelegt werden: {$dir}");
        }
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        $tmp = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
        if (file_put_contents($tmp, $json . "\n") === false) {
            throw new RuntimeException("Datei kann nicht geschrieben werden: {$tmp}");
        }
        chmod($tmp, 0600);
        rename($tmp, $file);
    }

    /**
     * Führt $callback exklusiv (per flock) aus – für Read-Modify-Write-Zyklen.
     *
     * @template T
     * @param callable(): T $callback
     * @return T
     */
    public static function locked(string $file, callable $callback): mixed
    {
        $dir = dirname($file);
        if (!is_dir($dir)) {
            mkdir($dir, 0700, true);
        }
        $lock = fopen($file . '.lock', 'c');
        if ($lock === false) {
            throw new RuntimeException("Lock-Datei kann nicht geöffnet werden: {$file}.lock");
        }
        try {
            flock($lock, LOCK_EX);
            return $callback();
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }
}
