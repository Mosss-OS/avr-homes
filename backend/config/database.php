<?php

/**
 * Database connection manager using a singleton PDO instance.
 *
 * Reads connection parameters from environment variables and supports
 * both TCP and Unix-socket MySQL connections.
 *
 * @package AvrHomes
 */

declare(strict_types=1);

/**
 * Singleton-style PDO connection factory.
 */
class Database
{
  private static ?PDO $instance = null;

  /**
   * Return the shared PDO connection, creating it on first call.
   *
   * @return PDO Active database connection.
   */
  public static function getConnection(): PDO
  {
    if (self::$instance === null) {
      $host = $_ENV['DB_HOST'] ?? '127.0.0.1';
      $port = $_ENV['DB_PORT'] ?? '3306';
      $name = $_ENV['DB_NAME'] ?? 'avr_homes';
      $user = $_ENV['DB_USER'] ?? 'root';
      $pass = $_ENV['DB_PASS'] ?? '';

      if ($host[0] === '/') {
        $dsn = "mysql:unix_socket={$host};dbname={$name};charset=utf8mb4";
      } else {
        $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
      }

      self::$instance = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
      ]);
    }

    return self::$instance;
  }
}
