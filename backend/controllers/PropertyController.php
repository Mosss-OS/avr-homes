<?php

declare(strict_types=1);

class PropertyController
{
  public static function index(array $params): void
  {
    $page    = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 12)));
    $sort    = $_GET['sort'] ?? 'created_at';
    $order   = $_GET['order'] ?? 'desc';

    $filters = [
      'purpose'   => $_GET['purpose'] ?? null,
      'type'      => $_GET['type'] ?? null,
      'city'      => $_GET['city'] ?? null,
      'community' => $_GET['community'] ?? null,
      'min_price' => $_GET['min_price'] ?? null,
      'max_price' => $_GET['max_price'] ?? null,
      'beds'      => $_GET['beds'] ?? null,
      'baths'     => $_GET['baths'] ?? null,
      'featured'  => $_GET['featured'] ?? null,
      'q'         => $_GET['q'] ?? null,
      'ids'       => !empty($_GET['ids']) ? explode(',', $_GET['ids']) : null,
    ];

    // Remove nulls
    $filters = array_filter($filters, fn($v) => $v !== null);

    $result = Property::findAll($filters, $page, $perPage, $sort, $order);

    Response::success($result, 'Properties retrieved successfully');
  }

  public static function show(array $params): void
  {
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) {
      Response::error('Invalid property ID', 400);
    }

    $property = Property::findById($id);
    if (!$property) {
      Response::error('Property not found', 404);
    }

    Response::success($property, 'Property retrieved successfully');
  }

  public static function store(array $params): void
  {
    $user = AuthMiddleware::authenticate();

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    $validator = new Validator($input);
    $validator
      ->required('title', 'Title')
      ->required('description', 'Description')
      ->required('type', 'Type')
      ->inArray('type', ['apartment', 'villa', 'townhouse', 'penthouse', 'studio'], 'Type')
      ->required('purpose', 'Purpose')
      ->inArray('purpose', ['buy', 'rent', 'shortlet'], 'Purpose')
      ->required('price', 'Price')
      ->numeric('price', 'Price')
      ->required('city', 'City')
      ->required('address', 'Address')
      ->required('lat', 'Latitude')
      ->numeric('lat', 'Latitude')
      ->required('lng', 'Longitude')
      ->numeric('lng', 'Longitude');

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();
    $propertyId = Property::create($data);

    // Log activity
    $db = Database::getConnection();
    $logStmt = $db->prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)');
    $logStmt->execute([$user['id'], 'create_property', 'property', $propertyId, $_SERVER['REMOTE_ADDR'] ?? '']);

    $property = Property::findById($propertyId);
    Response::success($property, 'Property created successfully', 201);
  }

  public static function update(array $params): void
  {
    $user = AuthMiddleware::authenticate();

    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) {
      Response::error('Invalid property ID', 400);
    }

    $existing = Property::findById($id);
    if (!$existing) {
      Response::error('Property not found', 404);
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    if (empty($input)) {
      Response::error('No data provided for update', 400);
    }

    // Validate only provided fields
    $validator = new Validator($input);
    if (isset($input['type'])) {
      $validator->inArray('type', ['apartment', 'villa', 'townhouse', 'penthouse', 'studio'], 'Type');
    }
    if (isset($input['purpose'])) {
      $validator->inArray('purpose', ['buy', 'rent', 'shortlet'], 'Purpose');
    }
    if (isset($input['price'])) {
      $validator->numeric('price', 'Price');
    }
    if (isset($input['lat'])) {
      $validator->numeric('lat', 'Latitude');
    }
    if (isset($input['lng'])) {
      $validator->numeric('lng', 'Longitude');
    }

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    Property::update($id, $input);

    // Log activity
    $db = Database::getConnection();
    $logStmt = $db->prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)');
    $logStmt->execute([$user['id'], 'update_property', 'property', $id, $_SERVER['REMOTE_ADDR'] ?? '']);

    $property = Property::findById($id);
    Response::success($property, 'Property updated successfully');
  }

  public static function destroy(array $params): void
  {
    $user = AuthMiddleware::authenticate();

    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) {
      Response::error('Invalid property ID', 400);
    }

    $existing = Property::findById($id);
    if (!$existing) {
      Response::error('Property not found', 404);
    }

    Property::delete($id);

    // Log activity
    $db = Database::getConnection();
    $logStmt = $db->prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)');
    $logStmt->execute([$user['id'], 'delete_property', 'property', $id, $_SERVER['REMOTE_ADDR'] ?? '']);

    Response::success(null, 'Property deleted successfully');
  }
}
