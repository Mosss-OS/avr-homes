<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/Response.php';
require_once __DIR__ . '/../utils/Validator.php';
require_once __DIR__ . '/../middleware/Cors.php';

Cors::handle();

$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

$uri = rtrim($uri, '/');
$uri = $uri ?: '/';

$routes = [
  'GET'    => [],
  'POST'   => [],
  'PUT'    => [],
  'PATCH'  => [],
  'DELETE' => [],
];

function route(string $method, string $pattern, callable $handler): void
{
  global $routes;
  $routes[strtoupper($method)][$pattern] = $handler;
}

function matchRoute(string $method, string $uri): ?array
{
  global $routes;

  if (!isset($routes[$method])) {
    return null;
  }

  foreach ($routes[$method] as $pattern => $handler) {
    $regex = preg_replace('/\{(\w+)\}/', '(?P<$1>[^/]+)', $pattern);
    $regex = '#^' . $regex . '$#';

    if (preg_match($regex, $uri, $matches)) {
      $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
      return ['handler' => $handler, 'params' => $params];
    }
  }

  return null;
}

require_once __DIR__ . '/../api/routes.php';

$matched = matchRoute($method, $uri);

if ($matched === null) {
  Response::error('Route not found', 404);
}

$handler = $matched['handler'];
$params  = $matched['params'];

try {
  if (is_array($handler)) {
    [$class, $method] = $handler;
    $controllerFile = __DIR__ . "/../controllers/{$class}.php";
    if (!file_exists($controllerFile)) {
      Response::error('Controller not found', 500);
    }
    require_once $controllerFile;
    if (!class_exists($class)) {
      Response::error('Controller class not found', 500);
    }
    if (!method_exists($class, $method)) {
      Response::error('Controller method not found', 500);
    }
    call_user_func([$class, $method], $params);
  } else {
    $handler($params);
  }
} catch (PDOException $e) {
  $message = $_ENV['APP_ENV'] === 'development' ? $e->getMessage() : 'Database error occurred';
  Response::error($message, 500);
} catch (Throwable $e) {
  $message = $_ENV['APP_ENV'] === 'development' ? $e->getMessage() : 'Internal server error';
  Response::error($message, 500);
}
