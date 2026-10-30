<?php

declare(strict_types=1);

namespace Reihenplanung\Cli;

use InvalidArgumentException;
use Reihenplanung\Config;
use Reihenplanung\UserRepository;

final class Console
{
    private const COMMANDS = [
        'user:create' => ['<email>', 'Benutzer anlegen'],
        'user:list' => ['', 'Benutzer auflisten'],
        'user:delete' => ['<email>', 'Benutzer samt Tokens löschen (Reihen bleiben erhalten)'],
        'token:create' => ['<email> [--name=<name>]', 'API-Token erzeugen (wird nur einmal angezeigt)'],
        'token:list' => ['[<email>]', 'Tokens auflisten'],
        'token:delete' => ['<token-id>', 'Token löschen'],
    ];

    private readonly UserRepository $users;

    public function __construct(Config $config)
    {
        $this->users = new UserRepository($config);
    }

    /** @param list<string> $argv */
    public function run(array $argv): int
    {
        $command = $argv[1] ?? 'help';
        [$args, $options] = self::parse(array_slice($argv, 2));

        try {
            return match ($command) {
                'user:create' => $this->userCreate($args),
                'user:list' => $this->userList(),
                'user:delete' => $this->userDelete($args),
                'token:create' => $this->tokenCreate($args, $options),
                'token:list' => $this->tokenList($args),
                'token:delete' => $this->tokenDelete($args),
                'help', '--help', '-h' => $this->help(),
                default => throw new InvalidArgumentException("Unbekannter Befehl: {$command}"),
            };
        } catch (InvalidArgumentException $e) {
            fwrite(STDERR, "Fehler: {$e->getMessage()}\n");

            return 1;
        }
    }

    /** @param list<string> $args */
    private function userCreate(array $args): int
    {
        $user = $this->users->createUser(self::required($args, 0, 'email'));
        echo "Benutzer angelegt: {$user->email} ({$user->id})\n";

        return 0;
    }

    private function userList(): int
    {
        $rows = array_map(fn ($u) => [$u->email, $u->id, $u->createdAt], $this->users->users());
        self::table(['E-Mail', 'ID', 'Erstellt'], $rows);

        return 0;
    }

    /** @param list<string> $args */
    private function userDelete(array $args): int
    {
        $user = $this->users->deleteUser(self::required($args, 0, 'email'));
        echo "Benutzer gelöscht: {$user->email}\n";

        return 0;
    }

    /**
     * @param list<string> $args
     * @param array<string, string> $options
     */
    private function tokenCreate(array $args, array $options): int
    {
        $email = self::required($args, 0, 'email');
        $user = $this->users->findByEmail($email) ?? throw new InvalidArgumentException("Benutzer nicht gefunden: {$email}");
        [$token, $plain] = $this->users->createToken($user, $options['name'] ?? 'default');

        echo "Token erstellt (ID {$token['id']}) für {$user->email}.\n";
        echo "Bitte jetzt kopieren – es wird nicht erneut angezeigt:\n\n  {$plain}\n\n";

        return 0;
    }

    /** @param list<string> $args */
    private function tokenList(array $args): int
    {
        $user = null;
        if (isset($args[0])) {
            $user = $this->users->findByEmail($args[0]) ?? throw new InvalidArgumentException("Benutzer nicht gefunden: {$args[0]}");
        }
        $emails = array_column(array_map(fn ($u) => $u->toArray(), $this->users->users()), 'email', 'id');
        $rows = array_map(
            fn (array $t) => [$t['id'], $emails[$t['userId']] ?? '?', $t['name'], $t['createdAt'], $t['lastUsedAt'] ?? '–'],
            $this->users->tokens($user),
        );
        self::table(['ID', 'E-Mail', 'Name', 'Erstellt', 'Zuletzt benutzt'], $rows);

        return 0;
    }

    /** @param list<string> $args */
    private function tokenDelete(array $args): int
    {
        $id = self::required($args, 0, 'token-id');
        if (!$this->users->deleteToken($id)) {
            throw new InvalidArgumentException("Token nicht gefunden: {$id}");
        }
        echo "Token gelöscht: {$id}\n";

        return 0;
    }

    private function help(): int
    {
        echo "Reihenplanung – Sync-Server\n\nVerwendung: bin/console <befehl> [argumente]\n\n";
        foreach (self::COMMANDS as $name => [$signature, $description]) {
            printf("  %-14s %-26s %s\n", $name, $signature, $description);
        }

        return 0;
    }

    /**
     * @param list<string> $argv
     * @return array{0: list<string>, 1: array<string, string>}
     */
    private static function parse(array $argv): array
    {
        $args = [];
        $options = [];
        foreach ($argv as $arg) {
            if (preg_match('/^--([\w-]+)(?:=(.*))?$/', $arg, $m) === 1) {
                $options[$m[1]] = $m[2] ?? '1';
            } else {
                $args[] = $arg;
            }
        }

        return [$args, $options];
    }

    /** @param list<string> $args */
    private static function required(array $args, int $index, string $name): string
    {
        return $args[$index] ?? throw new InvalidArgumentException("Argument <{$name}> fehlt");
    }

    /**
     * @param list<string> $headers
     * @param list<list<string>> $rows
     */
    private static function table(array $headers, array $rows): void
    {
        if ($rows === []) {
            echo "(keine Einträge)\n";

            return;
        }
        $widths = array_map(
            fn (int $i) => max(array_map(mb_strlen(...), array_column([$headers, ...$rows], $i))),
            array_keys($headers),
        );
        $line = fn (array $cells) => implode('  ', array_map(
            fn ($cell, $w) => $cell . str_repeat(' ', $w - mb_strlen($cell)),
            $cells,
            $widths,
        ));
        echo $line($headers), "\n", $line(array_map(fn ($w) => str_repeat('-', $w), $widths)), "\n";
        foreach ($rows as $row) {
            echo $line($row), "\n";
        }
    }
}
