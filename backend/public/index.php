<?php

/**
 * Application entry point — front controller.
 *
 * Loads configuration, utilities, middleware, and models; registers route definitions
 * from api/routes.php, matches the incoming request URI against registered routes,
 * and dispatches to the appropriate controller or callable handler.
 *
 * @package AvrHomes
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/Response.php';
require_once __DIR__ . '/../utils/Validator.php';
require_once __DIR__ . '/../middleware/Cors.php';

// Autoload models, middleware, and services
foreach (glob(__DIR__ . '/../models/*.php') as $modelFile) {
    require_once $modelFile;
}
foreach (glob(__DIR__ . '/../middleware/*.php') as $middlewareFile) {
    require_once $middlewareFile;
}

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

/**
 * Register a route for a given HTTP method and URI pattern.
 *
 * @param string               $method  HTTP method (GET, POST, PUT, PATCH, DELETE).
 * @param string               $pattern URI pattern, may contain {param} placeholders.
 * @param array|callable       $handler Controller/method pair as [class, method] or a Closure.
 */
function route(string $method, string $pattern, array|callable $handler): void
{
  global $routes;
  $routes[strtoupper($method)][$pattern] = $handler;
}

/**
 * Match a request method + URI against the registered route table.
 *
 * Converts URI patterns with {param} placeholders to named regex groups and
 * returns the matched handler and extracted parameters.
 *
 * @param string $method HTTP method.
 * @param string $uri    Request URI path.
 * @return array|null    ['handler' => ..., 'params' => [...]] or null if no match.
 */
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
