<?php

/**
 * Serves market data, price indices, heatmap data, and market reports.
 * Provides both public endpoints and admin-only report publishing.
 */
class MarketDataController
{
  /**
   * List market data filtered by city, property type, and purpose.
   *
   * @param array $params Route parameters (unused).
   * @return void
   */
  public static function index(array $params): void
  {
    $city = $_GET['city'] ?? 'Lagos';
    $propertyType = $_GET['type'] ?? null;
    $purpose = $_GET['purpose'] ?? null;
    $period = $_GET['period'] ?? 'quarterly';

    $db = Database::getConnection();
    $conditions = ['city = ?'];
    $bindings = [$city];

    if ($propertyType) {
      $conditions[] = 'property_type = ?';
      $bindings[] = $propertyType;
    }
    if ($purpose) {
      $conditions[] = 'purpose = ?';
      $bindings[] = $purpose;
    }

    $where = implode(' AND ', $conditions);

    $stmt = $db->prepare(
      "SELECT * FROM market_data WHERE {$where} ORDER BY period DESC LIMIT 20"
    );
    $stmt->execute($bindings);
    $data = $stmt->fetchAll();

    foreach ($data as &$row) {
      $row['id'] = (int)$row['id'];
      $row['avg_price'] = (float)$row['avg_price'];
      $row['avg_rent'] = (float)$row['avg_rent'];
      $row['yield'] = (float)$row['yield'];
      $row['sample_size'] = (int)$row['sample_size'];
    }

    Response::success($data, 'Market data retrieved');
  }

  /**
   * Get heatmap data (latest period) with coordinates for map rendering.
   *
   * @param array $params Route parameters (unused).
   * @return void
   */
  public static function heatmap(array $params): void
  {
    $city = $_GET['city'] ?? 'Lagos';
    $propertyType = $_GET['type'] ?? null;
    $purpose = $_GET['purpose'] ?? 'buy';

    $db = Database::getConnection();
    $conditions = ['city = ?', 'purpose = ?'];
    $bindings = [$city, $purpose];

    if ($propertyType) {
      $conditions[] = 'property_type = ?';
      $bindings[] = $propertyType;
    }

    $where = implode(' AND ', $conditions);

    // Get latest period data for heatmap
    $stmt = $db->prepare(
      "SELECT community, avg_price, avg_rent, yield, sample_size, property_type, lat, lng
       FROM market_data 
       WHERE {$where} AND period = (SELECT MAX(period) FROM market_data WHERE {$where})
       ORDER BY sample_size DESC"
    );
    $stmt->execute($bindings);
    $data = $stmt->fetchAll();

    foreach ($data as &$row) {
      $row['avg_price'] = (float)$row['avg_price'];
      $row['avg_rent'] = (float)$row['avg_rent'];
      $row['yield'] = (float)$row['yield'];
      $row['sample_size'] = (int)$row['sample_size'];
      $row['lat'] = (float)$row['lat'];
      $row['lng'] = (float)$row['lng'];
    }

    Response::success($data, 'Heatmap data retrieved');
  }

  /**
   * Get the price index over time (last 8 periods) with period-over-period changes.
   *
   * @param array $params Route parameters (unused).
   * @return void
   */
  public static function priceIndex(array $params): void
  {
    $city = $_GET['city'] ?? 'Lagos';
    $propertyType = $_GET['type'] ?? null;
    $purpose = $_GET['purpose'] ?? 'buy';

    $db = Database::getConnection();
    $conditions = ['city = ?', 'purpose = ?'];
    $bindings = [$city, $purpose];

    if ($propertyType) {
      $conditions[] = 'property_type = ?';
      $bindings[] = $propertyType;
    }

    $where = implode(' AND ', $conditions);

    // Get price index over time (last 8 periods)
    $stmt = $db->prepare(
      "SELECT period, AVG(avg_price) as index_value, SUM(sample_size) as total_samples
       FROM market_data 
       WHERE {$where}
       GROUP BY period
       ORDER BY period DESC
       LIMIT 8"
    );
    $stmt->execute($bindings);
    $index = $stmt->fetchAll();

    // Calculate period-over-period changes
    $indexData = [];
    foreach ($index as $i => $row) {
      $change = null;
      if (isset($index[$i + 1])) {
        $prev = (float)$index[$i + 1]['index_value'];
        $curr = (float)$row['index_value'];
        $change = $prev > 0 ? round((($curr - $prev) / $prev) * 100, 2) : null;
      }
      $indexData[] = [
        'period' => $row['period'],
        'index_value' => (float)$row['index_value'],
        'change_pct' => $change,
        'samples' => (int)$row['total_samples'],
      ];
    }

    // Current stats
    $stmt = $db->prepare(
      "SELECT AVG(avg_price) as current_avg, AVG(yield) as current_yield, SUM(sample_size) as total_samples
       FROM market_data WHERE {$where} AND period = (SELECT MAX(period) FROM market_data WHERE {$where})"
    );
    $stmt->execute($bindings);
    $current = $stmt->fetch();

    Response::success([
      'city' => $city,
      'property_type' => $propertyType,
      'purpose' => $purpose,
      'current_avg_price' => $current ? (float)$current['current_avg'] : 0,
      'current_yield' => $current ? (float)$current['current_yield'] : 0,
      'total_samples' => $current ? (int)$current['total_samples'] : 0,
      'index_history' => array_reverse($indexData),
    ], 'Price index retrieved');
  }

  /**
   * Retrieve a specific market report by period identifier.
   *
   * @param array $params Route parameters containing 'period'.
   * @return void
   */
  public static function report(array $params): void
  {
    $period = $params['period'] ?? date('Y') . '-Q' . ceil(date('n') / 3);

    $db = Database::getConnection();
    $stmt = $db->prepare(
      'SELECT * FROM market_reports WHERE period = ?'
    );
    $stmt->execute([$period]);
    $report = $stmt->fetch();

    if (!$report) {
      Response::error('Report not found', 404);
    }

    $report['highlights'] = json_decode($report['highlights'] ?? '[]', true);
    $report['charts_data'] = json_decode($report['charts_data'] ?? '[]', true);

    Response::success($report, 'Market report retrieved');
  }

  /**
   * Publish or update a market report with PDF URL and highlights.
   * Requires admin authentication.
   *
   * @param array $params Route parameters (unused).
   * @return void
   */
  public static function publishReport(array $params): void
  {
    AuthMiddleware::authenticateAdmin();

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    $validator = new Validator($input);
    $validator
      ->required('period', 'Period')
      ->required('pdf_url', 'PDF URL')
      ->required('highlights', 'Highlights');

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();

    $db = Database::getConnection();
    $stmt = $db->prepare(
      'INSERT INTO market_reports (period, pdf_url, highlights, charts_data, published_at)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE pdf_url = VALUES(pdf_url), highlights = VALUES(highlights), charts_data = VALUES(charts_data), published_at = NOW()'
    );
    $stmt->execute([
      $data['period'],
      $data['pdf_url'],
      json_encode($data['highlights']),
      json_encode($data['charts_data'] ?? []),
    ]);

    Response::success(['period' => $data['period']], 'Report published', 201);
  }

  /**
   * List all published market reports with pagination.
   *
   * @param array $params Route parameters (unused).
   * @return void
   */
  public static function reportsList(array $params): void
  {
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(20, max(1, (int)($_GET['per_page'] ?? 10)));

    $db = Database::getConnection();

    $countStmt = $db->query('SELECT COUNT(*) FROM market_reports');
    $total = (int)$countStmt->fetchColumn();

    $offset = ($page - 1) * $perPage;
    $stmt = $db->prepare(
      'SELECT id, period, pdf_url, highlights, published_at FROM market_reports ORDER BY published_at DESC LIMIT ? OFFSET ?'
    );
    $stmt->execute([$perPage, $offset]);
    $reports = $stmt->fetchAll();

    foreach ($reports as &$report) {
      $report['id'] = (int)$report['id'];
      $report['highlights'] = json_decode($report['highlights'] ?? '[]', true);
    }

    Response::success([
      'data' => $reports,
      'total' => $total,
      'page' => $page,
      'per_page' => $perPage,
      'total_pages' => (int)ceil($total / $perPage),
    ], 'Market reports retrieved');
  }
}