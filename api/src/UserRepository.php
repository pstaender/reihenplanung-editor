<?php

declare(strict_types=1);

namespace Reihenplanung;

use DateTimeImmutable;
use DateTimeInterface;
use InvalidArgumentException;

/**
 * Benutzer und API-Tokens liegen gemeinsam in data/users.json.
 * Tokens werden nur als SHA-256-Hash gespeichert.
 */
final class UserRepository
{
    private const TOKEN_PREFIX = 'rp_';

    private readonly string $file;

    public function __construct(Config $config)
    {
        $this->file = $config->dataDir . '/users.json';
    }

    /** @return list<User> */
    public function users(): array
    {
        return array_map(User::fromArray(...), $this->load()['users']);
    }

    public function findByEmail(string $email): ?User
    {
        $email = self::normalizeEmail($email);
        foreach ($this->users() as $user) {
            if ($user->email === $email) {
                return $user;
            }
        }

        return null;
    }

    public function createUser(string $email): User
    {
        $email = self::normalizeEmail($email);
        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new InvalidArgumentException("Ungültige E-Mail-Adresse: {$email}");
        }

        return $this->mutate(function (array &$data) use ($email): User {
            foreach ($data['users'] as $user) {
                if ($user['email'] === $email) {
                    throw new InvalidArgumentException("Benutzer existiert bereits: {$email}");
                }
            }
            $user = new User(Uuid::v4(), $email, self::now());
            $data['users'][] = $user->toArray();

            return $user;
        });
    }

    public function deleteUser(string $email): User
    {
        $user = $this->findByEmail($email) ?? throw new InvalidArgumentException("Benutzer nicht gefunden: {$email}");

        $this->mutate(function (array &$data) use ($user): void {
            $data['users'] = array_values(array_filter($data['users'], fn (array $u) => $u['id'] !== $user->id));
            $data['tokens'] = array_values(array_filter($data['tokens'], fn (array $t) => $t['userId'] !== $user->id));
        });

        return $user;
    }

    /**
     * Erstellt ein Token und gibt [Token-Metadaten, Klartext-Token] zurück.
     * Der Klartext wird nirgends gespeichert.
     *
     * @return array{0: array<string, mixed>, 1: string}
     */
    public function createToken(User $user, string $name): array
    {
        $plain = self::TOKEN_PREFIX . bin2hex(random_bytes(24));
        $token = [
            'id' => substr(Uuid::v4(), 0, 8),
            'userId' => $user->id,
            'name' => $name,
            'hash' => hash('sha256', $plain),
            'createdAt' => self::now(),
            'lastUsedAt' => null,
        ];
        $this->mutate(function (array &$data) use ($token): void {
            $data['tokens'][] = $token;
        });

        return [$token, $plain];
    }

    /** @return list<array<string, mixed>> */
    public function tokens(?User $user = null): array
    {
        $tokens = $this->load()['tokens'];
        if ($user !== null) {
            $tokens = array_filter($tokens, fn (array $t) => $t['userId'] === $user->id);
        }

        return array_values($tokens);
    }

    public function deleteToken(string $tokenId): bool
    {
        return $this->mutate(function (array &$data) use ($tokenId): bool {
            $before = count($data['tokens']);
            $data['tokens'] = array_values(array_filter($data['tokens'], fn (array $t) => $t['id'] !== $tokenId));

            return count($data['tokens']) < $before;
        });
    }

    public function authenticate(string $plainToken): ?User
    {
        $hash = hash('sha256', $plainToken);
        $data = $this->load();
        foreach ($data['tokens'] as $token) {
            if (hash_equals($token['hash'], $hash)) {
                $this->touchToken($token['id']);
                foreach ($data['users'] as $user) {
                    if ($user['id'] === $token['userId']) {
                        return User::fromArray($user);
                    }
                }
            }
        }

        return null;
    }

    private function touchToken(string $tokenId): void
    {
        $this->mutate(function (array &$data) use ($tokenId): void {
            foreach ($data['tokens'] as &$token) {
                if ($token['id'] === $tokenId) {
                    $token['lastUsedAt'] = self::now();
                }
            }
        });
    }

    /** @return array{users: list<array<string, mixed>>, tokens: list<array<string, mixed>>} */
    private function load(): array
    {
        $data = JsonStore::read($this->file, []);

        return ['users' => $data['users'] ?? [], 'tokens' => $data['tokens'] ?? []];
    }

    /**
     * @template T
     * @param callable(array &$data): T $change
     * @return T
     */
    private function mutate(callable $change): mixed
    {
        return JsonStore::locked($this->file, function () use ($change) {
            $data = $this->load();
            $result = $change($data);
            JsonStore::write($this->file, $data);

            return $result;
        });
    }

    private static function normalizeEmail(string $email): string
    {
        return strtolower(trim($email));
    }

    private static function now(): string
    {
        return (new DateTimeImmutable())->format(DateTimeInterface::ATOM);
    }
}
