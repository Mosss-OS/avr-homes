<?php

declare(strict_types=1);

/**
 * Short-let booking endpoints.
 *
 * @package AVRHomes\Controllers
 */

/**
 * Controller for short-let property availability and booking management.
 *
 * Handles availability checks, booking requests, booking listing,
 * and booking status updates for short-let properties.
 *
 * @package AVRHomes\Controllers
 */
class ShortLetController
{
  /**
   * Check availability for a date range.
   *
   * GET /api/shortlet/{id}/availability?check_in=2026-07-10&check_out=2026-07-15
   *
   * @param array $params Route parameters containing 'id' (property ID).
   *
   * @return void
   */
  public static function availability(array $params): void
  {
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid property ID', 400);

    $checkIn = $_GET['check_in'] ?? null;
    $checkOut = $_GET['check_out'] ?? null;

    $db = Database::getConnection();

    // Verify it's a shortlet property
    $stmt = $db->prepare("SELECT purpose, nightly_price, min_stay, max_stay FROM properties WHERE id = ? AND is_active = 1");
    $stmt->execute([$id]);
    $prop = $stmt->fetch();

    if (!$prop) Response::error('Property not found', 404);
    if ($prop['purpose'] !== 'shortlet') Response::error('Not a short-let property', 400);

    // If dates provided, check each date
    $unavailable = [];
    $totalPrice = 0;
    $nights = 0;

    if ($checkIn && $checkOut) {
      $start = new DateTime($checkIn);
      $end = new DateTime($checkOut);
      $nights = (int)$start->diff($end)->days;

      if ($nights < (int)$prop['min_stay']) {
        Response::error("Minimum stay is {$prop['min_stay']} nights", 422);
      }
      if ($prop['max_stay'] && $nights > (int)$prop['max_stay']) {
        Response::error("Maximum stay is {$prop['max_stay']} nights", 422);
      }

      // Check bookings that overlap
      $bookStmt = $db->prepare(
        "SELECT check_in, check_out FROM property_bookings 
         WHERE property_id = ? AND status IN ('pending','confirmed')
         AND check_in < ? AND check_out > ?"
      );
      $bookStmt->execute([$id, $checkOut, $checkIn]);
      while ($b = $bookStmt->fetch()) {
        $bStart = new DateTime($b['check_in']);
        $bEnd = new DateTime($b['check_out']);
        $interval = new DateInterval('P1D');
        $period = new DatePeriod($bStart, $interval, $bEnd);
        foreach ($period as $date) {
          $ds = $date->format('Y-m-d');
          if ($ds >= $checkIn && $ds < $checkOut) {
            $unavailable[] = $ds;
          }
        }
      }

      // Check availability table
      $availStmt = $db->prepare(
        "SELECT date, is_available, price_override FROM property_availability 
         WHERE property_id = ? AND date >= ? AND date < ?"
      );
      $availStmt->execute([$id, $checkIn, $checkOut]);
      while ($a = $availStmt->fetch()) {
        if (!$a['is_available']) {
          $unavailable[] = $a['date'];
        }
        // Use override price if set
        $nightPrice = $a['price_override'] ?? (int)$prop['nightly_price'];
        if (!in_array($a['date'], $unavailable)) {
          $totalPrice += $nightPrice;
        }
      }

      // If no availability records exist, use nightly_price for all nights
      if ($totalPrice === 0 && empty($unavailable)) {
        $totalPrice = (int)$prop['nightly_price'] * $nights;
      }
    }

    Response::success([
      'property_id' => $id,
      'nightly_price' => (int)$prop['nightly_price'],
      'min_stay' => (int)$prop['min_stay'],
      'max_stay' => $prop['max_stay'] ? (int)$prop['max_stay'] : null,
      'check_in' => $checkIn,
      'check_out' => $checkOut,
      'nights' => $nights,
      'total_price' => $totalPrice,
      'unavailable_dates' => $unavailable,
      'is_available' => empty($unavailable) && $nights > 0,
    ], 'Availability checked');
  }

  /**
   * Create a booking request.
   *
   * POST /api/shortlet/{id}/book
   *
   * @param array $params Route parameters containing 'id' (property ID).
   *
   * @return void
   */
  public static function book(array $params): void
  {
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid property ID', 400);

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;

    $validator = new Validator($input);
    $validator
      ->required('guest_name', 'Guest name')
      ->required('guest_email', 'Guest email')
      ->required('guest_phone', 'Guest phone')
      ->required('check_in', 'Check-in date')
      ->required('check_out', 'Check-out date')
      ->required('guests', 'Number of guests');

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();
    $db = Database::getConnection();

    $stmt = $db->prepare("SELECT nightly_price, min_stay FROM properties WHERE id = ? AND purpose = 'shortlet' AND is_active = 1");
    $stmt->execute([$id]);
    $prop = $stmt->fetch();

    if (!$prop) Response::error('Property not found or not a short-let', 404);

    $checkIn = new DateTime($data['check_in']);
    $checkOut = new DateTime($data['check_out']);
    $nights = (int)$checkIn->diff($checkOut)->days;

    if ($nights < (int)$prop['min_stay']) {
      Response::error("Minimum stay is {$prop['min_stay']} nights", 422);
    }

    $totalPrice = $nights * (int)$prop['nightly_price'];

    // Check availability (simple check — no overlapping bookings)
    $bookStmt = $db->prepare(
      "SELECT COUNT(*) FROM property_bookings 
       WHERE property_id = ? AND status IN ('pending','confirmed')
       AND check_in < ? AND check_out > ?"
    );
    $bookStmt->execute([$id, $data['check_out'], $data['check_in']]);
    if ((int)$bookStmt->fetchColumn() > 0) {
      Response::error('Property is not available for the selected dates', 409);
    }

    $insertStmt = $db->prepare(
      "INSERT INTO property_bookings (property_id, guest_name, guest_email, guest_phone, check_in, check_out, guests, total_price, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')"
    );
    $insertStmt->execute([
      $id,
      $data['guest_name'],
      $data['guest_email'],
      $data['guest_phone'],
      $data['check_in'],
      $data['check_out'],
      (int)($data['guests'] ?? 1),
      $totalPrice,
    ]);

    $bookingId = (int)$db->lastInsertId();

    Response::success([
      'booking_id' => $bookingId,
      'total_price' => $totalPrice,
      'nights' => $nights,
      'status' => 'pending',
    ], 'Booking request submitted', 201);
  }

  /**
   * [Admin] List availability for a property in a date range.
   *
   * GET /api/admin/shortlet/{id}/availability?month=2026-07
   */
  public static function adminAvailability(array $params): void
  {
    AuthMiddleware::authenticateAgent();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid property ID', 400);

    $month = $_GET['month'] ?? date('Y-m');
    $start = $month . '-01';
    $end = date('Y-m-t', strtotime($start));

    $db = Database::getConnection();

    $prop = $db->prepare("SELECT id, title, nightly_price, purpose FROM properties WHERE id = ?");
    $prop->execute([$id]);
    $property = $prop->fetch();
    if (!$property) Response::error('Property not found', 404);

    // Booked dates (confirmed + pending)
    $bookStmt = $db->prepare(
      "SELECT check_in, check_out, id as booking_id, guest_name, status
       FROM property_bookings
       WHERE property_id = ? AND status IN ('pending','confirmed','completed')
       AND check_in < ? AND check_out > ?"
    );
    $bookStmt->execute([$id, $end, $start]);
    $bookings = $bookStmt->fetchAll();

    // Availability overrides
    $availStmt = $db->prepare(
      "SELECT date, is_available, price_override FROM property_availability
       WHERE property_id = ? AND date >= ? AND date <= ?"
    );
    $availStmt->execute([$id, $start, $end]);
    $availRecords = $availStmt->fetchAll();
    $availMap = [];
    foreach ($availRecords as $a) {
      $availMap[$a['date']] = ['is_available' => (bool)$a['is_available'], 'price_override' => $a['price_override'] ? (int)$a['price_override'] : null];
    }

    // Build calendar days
    $days = [];
    $current = new DateTime($start);
    $lastDay = new DateTime($end);
    while ($current <= $lastDay) {
      $ds = $current->format('Y-m-d');
      $day = [
        'date' => $ds,
        'is_available' => true,
        'price_override' => null,
        'booking' => null,
      ];
      if (isset($availMap[$ds])) {
        $day['is_available'] = $availMap[$ds]['is_available'];
        $day['price_override'] = $availMap[$ds]['price_override'];
      }
      foreach ($bookings as $b) {
        if ($ds >= $b['check_in'] && $ds < $b['check_out']) {
          $day['booking'] = [
            'id' => (int)$b['booking_id'],
            'guest_name' => $b['guest_name'],
            'status' => $b['status'],
          ];
          $day['is_available'] = false;
          break;
        }
      }
      $days[] = $day;
      $current->modify('+1 day');
    }

    Response::success([
      'property' => $property,
      'month' => $month,
      'days' => $days,
    ], 'Availability retrieved');
  }

  /**
   * [Admin] Toggle availability for a specific date.
   *
   * PUT /api/admin/shortlet/availability
   */
  public static function adminUpdateAvailability(array $params): void
  {
    AuthMiddleware::authenticateAgent();
    $data = json_decode(file_get_contents('php://input'), true);

    $propertyId = (int)($data['property_id'] ?? 0);
    $date = $data['date'] ?? '';
    $isAvailable = (bool)($data['is_available'] ?? true);
    $priceOverride = isset($data['price_override']) ? (int)$data['price_override'] : null;

    if (!$propertyId || !$date) Response::error('Property ID and date required', 400);

    $db = Database::getConnection();
    $stmt = $db->prepare(
      "INSERT INTO property_availability (property_id, date, is_available, price_override)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE is_available = VALUES(is_available), price_override = VALUES(price_override)"
    );
    $stmt->execute([$propertyId, $date, $isAvailable ? 1 : 0, $priceOverride]);

    Response::success([], 'Availability updated');
  }

  /**
   * [Admin] Set availability for multiple dates at once.
   *
   * PUT /api/admin/shortlet/availability/batch
   */
  public static function adminBatchAvailability(array $params): void
  {
    AuthMiddleware::authenticateAgent();
    $data = json_decode(file_get_contents('php://input'), true);

    $propertyId = (int)($data['property_id'] ?? 0);
    $dates = $data['dates'] ?? [];
    $isAvailable = (bool)($data['is_available'] ?? true);
    $priceOverride = isset($data['price_override']) ? (int)$data['price_override'] : null;

    if (!$propertyId || empty($dates)) Response::error('Property ID and dates required', 400);

    $db = Database::getConnection();
    $stmt = $db->prepare(
      "INSERT INTO property_availability (property_id, date, is_available, price_override)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE is_available = VALUES(is_available), price_override = VALUES(price_override)"
    );
    foreach ($dates as $date) {
      $stmt->execute([$propertyId, $date, $isAvailable ? 1 : 0, $priceOverride]);
    }

    Response::success(['updated' => count($dates)], 'Availability updated');
  }

  /**
   * [Admin] List bookings for a property (admin version).
   *
   * GET /api/admin/shortlet/{id}/bookings
   */
  public static function adminPropertyBookings(array $params): void
  {
    AuthMiddleware::authenticateAgent();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid property ID', 400);

    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
    $offset = ($page - 1) * $perPage;

    $db = Database::getConnection();

    $countStmt = $db->prepare('SELECT COUNT(*) FROM property_bookings WHERE property_id = ?');
    $countStmt->execute([$id]);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $db->prepare(
      "SELECT pb.*, p.title as property_title
       FROM property_bookings pb
       LEFT JOIN properties p ON p.id = pb.property_id
       WHERE pb.property_id = ?
       ORDER BY pb.check_in DESC
       LIMIT {$perPage} OFFSET {$offset}"
    );
    $stmt->execute([$id]);
    $bookings = $stmt->fetchAll();

    foreach ($bookings as &$b) {
      $b['id'] = (int)$b['id'];
      $b['property_id'] = (int)$b['property_id'];
      $b['guests'] = (int)$b['guests'];
      $b['total_price'] = (int)$b['total_price'];
    }

    Response::success([
      'data' => $bookings,
      'total' => $total,
      'page' => $page,
      'total_pages' => (int)ceil($total / $perPage),
    ], 'Property bookings retrieved');
  }

  /**
   * [Admin] Get short-let dashboard stats.
   *
   * GET /api/admin/shortlet/stats
   */
  public static function adminDashboardStats(array $params): void
  {
    AuthMiddleware::authenticateAgent();
    $db = Database::getConnection();

    $stmt = $db->query(
      "SELECT
         COUNT(DISTINCT p.id) as total_shortlets,
         COUNT(DISTINCT CASE WHEN pb.status IN ('pending','confirmed') THEN pb.property_id END) as active_bookings_properties,
         COUNT(CASE WHEN pb.status = 'pending' THEN 1 END) as pending_bookings,
         COUNT(CASE WHEN pb.status = 'confirmed' THEN 1 END) as confirmed_bookings,
         COUNT(CASE WHEN pb.status = 'completed' THEN 1 END) as completed_bookings,
         COALESCE(SUM(CASE WHEN pb.status IN ('confirmed','completed') THEN pb.total_price END), 0) as total_revenue
       FROM properties p
       LEFT JOIN property_bookings pb ON pb.property_id = p.id
       WHERE p.purpose = 'shortlet'"
    );
    $stats = $stmt->fetch();

    $stats['total_shortlets'] = (int)$stats['total_shortlets'];
    $stats['active_bookings_properties'] = (int)$stats['active_bookings_properties'];
    $stats['pending_bookings'] = (int)$stats['pending_bookings'];
    $stats['confirmed_bookings'] = (int)$stats['confirmed_bookings'];
    $stats['completed_bookings'] = (int)$stats['completed_bookings'];
    $stats['total_revenue'] = (float)$stats['total_revenue'];

    Response::success($stats, 'Dashboard stats retrieved');
  }

  /**
   * List bookings for a property (agent).
   *
   * GET /api/agent/shortlet/{id}/bookings
   *
   * @param array $params Route parameters containing 'id' (property ID).
   *
   * @return void
   */
  public static function bookings(array $params): void
  {
    AuthMiddleware::authenticateAgent();

    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid property ID', 400);

    $db = Database::getConnection();
    $stmt = $db->prepare(
      "SELECT * FROM property_bookings WHERE property_id = ? ORDER BY check_in DESC LIMIT 50"
    );
    $stmt->execute([$id]);
    $bookings = $stmt->fetchAll();

    foreach ($bookings as &$b) {
      $b['id'] = (int)$b['id'];
      $b['property_id'] = (int)$b['property_id'];
      $b['guests'] = (int)$b['guests'];
      $b['total_price'] = (int)$b['total_price'];
    }

    Response::success($bookings, 'Bookings retrieved');
  }

  /**
   * Update booking status (agent).
   *
   * PUT /api/agent/shortlet/bookings/{id}/status
   *
   * @param array $params Route parameters containing 'id' (booking ID).
   *
   * @return void
   */
  public static function updateBookingStatus(array $params): void
  {
    AuthMiddleware::authenticateAgent();

    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid booking ID', 400);

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;

    $status = $input['status'] ?? null;
    if (!in_array($status, ['confirmed', 'cancelled', 'completed'])) {
      Response::error('Invalid status. Use: confirmed, cancelled, completed', 422);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare("UPDATE property_bookings SET status = ? WHERE id = ?");
    $stmt->execute([$status, $id]);

    Response::success(['id' => $id, 'status' => $status], 'Booking status updated');
  }
}
