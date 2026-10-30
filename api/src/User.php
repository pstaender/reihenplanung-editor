<?php

declare(strict_types=1);

namespace Reihenplanung;

final readonly class User
{
    public function __construct(
        public string $id,
        public string $email,
        public string $createdAt,
    ) {
    }

    /** @param array{id: string, email: string, createdAt: string} $data */
    public static function fromArray(array $data): self
    {
        return new self($data['id'], $data['email'], $data['createdAt']);
    }

    /** @return array{id: string, email: string, createdAt: string} */
    public function toArray(): array
    {
        return ['id' => $this->id, 'email' => $this->email, 'createdAt' => $this->createdAt];
    }
}
