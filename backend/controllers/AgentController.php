<?php

declare(strict_types=1);

class AgentController
{
  public static function index(array $params): void
  {
    $agents = Agent::findAll();
    Response::success($agents, 'Agents retrieved successfully');
  }

  public static function show(array $params): void
  {
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) {
      Response::error('Invalid agent ID', 400);
    }

    $agent = Agent::findById($id);
    if (!$agent) {
      Response::error('Agent not found', 404);
    }

    Response::success($agent, 'Agent retrieved successfully');
  }
}
