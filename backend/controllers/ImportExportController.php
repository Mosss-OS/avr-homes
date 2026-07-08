<?php

declare(strict_types=1);

class ImportExportController
{
  /* ── CSV Export helpers ────────────────────────────────── */

  private static function outputCsv(string $filename, array $headers, array $rows): void
  {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    $fp = fopen('php://output', 'w');
    fputcsv($fp, $headers);
    foreach ($rows as $row) fputcsv($fp, $row);
    fclose($fp);
    exit;
  }

  /* ── Export Properties ─────────────────────────────────── */

  public static function exportProperties(): void
  {
    AuthMiddleware::authenticateAgent();
    $db = Database::getConnection();
    $rows = $db->query(
      "SELECT p.*, a.name as agent_name, a.agency as agent_agency
       FROM properties p LEFT JOIN agents a ON p.agent_id = a.id
       ORDER BY p.id ASC"
    )->fetchAll();

    $headers = ['ID','Title','Slug','Description','Type','Purpose','Price','Nightly Price',
      'Min Stay','Max Stay','Beds','Baths','Area','City','Community','Address','Lat','Lng',
      'Status','Featured','Verified','Agent Name','Agent Agency','Created At'];
    $data = [];
    foreach ($rows as $r) {
      $data[] = [
        $r['id'], $r['title'], $r['slug'], strip_tags($r['description'] ?? ''),
        $r['type'], $r['purpose'], $r['price'], $r['nightly_price'] ?? '',
        $r['min_stay'] ?? '', $r['max_stay'] ?? '',
        $r['beds'], $r['baths'], $r['area'],
        $r['city'], $r['community'], $r['address'],
        $r['lat'] ?? '', $r['lng'] ?? '',
        $r['is_active'] == 1 ? 'Active' : ($r['is_active'] == 0 ? 'Draft' : 'Archived'),
        $r['featured'] ? 'Yes' : 'No',
        $r['is_verified'] ? 'Yes' : 'No',
        $r['agent_name'] ?? '', $r['agent_agency'] ?? '',
        $r['created_at'],
      ];
    }
    self::outputCsv('properties-export.csv', $headers, $data);
  }

  /* ── Export Users ──────────────────────────────────────── */

  public static function exportUsers(): void
  {
    AuthMiddleware::authenticateAgent();
    $db = Database::getConnection();
    $rows = $db->query("SELECT * FROM users ORDER BY id ASC")->fetchAll();

    $headers = ['ID','Name','Email','Role','Active','Email Verified','Created At'];
    $data = [];
    foreach ($rows as $r) {
      $data[] = [
        $r['id'], $r['name'], $r['email'], $r['role'],
        $r['is_active'] ? 'Yes' : 'No',
        $r['email_verified_at'] ?? '',
        $r['created_at'],
      ];
    }
    self::outputCsv('users-export.csv', $headers, $data);
  }

  /* ── Export Agents ─────────────────────────────────────── */

  public static function exportAgents(): void
  {
    AuthMiddleware::authenticateAgent();
    $db = Database::getConnection();
    $rows = $db->query(
      "SELECT a.*, u.email as user_email FROM agents a LEFT JOIN users u ON a.user_id = u.id ORDER BY a.id ASC"
    )->fetchAll();

    $headers = ['ID','Name','Agency','Phone','Email','WhatsApp','City','State',
      'Experience','Verified','Active','Listings','User Email','Created At'];
    $data = [];
    foreach ($rows as $r) {
      $data[] = [
        $r['id'], $r['name'], $r['agency'], $r['phone'], $r['email'],
        $r['whatsapp'] ?? '', $r['city'] ?? '', $r['state'] ?? '',
        $r['experience'] ?? '', $r['is_verified'] ? 'Yes' : 'No',
        $r['is_active'] ? 'Yes' : 'No', $r['listings'] ?? '0',
        $r['user_email'] ?? '', $r['created_at'],
      ];
    }
    self::outputCsv('agents-export.csv', $headers, $data);
  }

  /* ── Export Bookings ───────────────────────────────────── */

  public static function exportBookings(): void
  {
    AuthMiddleware::authenticateAgent();
    $db = Database::getConnection();
    $rows = $db->query(
      "SELECT b.*, p.title as property_title
       FROM property_bookings b LEFT JOIN properties p ON b.property_id = p.id
       ORDER BY b.id ASC"
    )->fetchAll();

    $headers = ['ID','Property ID','Property Title','Guest Name','Guest Email','Guest Phone',
      'Check In','Check Out','Guests','Total Price','Status','Notes','Created At'];
    $data = [];
    foreach ($rows as $r) {
      $data[] = [
        $r['id'], $r['property_id'], $r['property_title'] ?? '',
        $r['guest_name'], $r['guest_email'], $r['guest_phone'],
        $r['check_in'], $r['check_out'],
        $r['guests'], $r['total_price'], $r['status'],
        $r['notes'] ?? '', $r['created_at'],
      ];
    }
    self::outputCsv('bookings-export.csv', $headers, $data);
  }

  /* ── Generate sample CSV content for download ─────────── */

  public static function sampleCsv(): void
  {
    AuthMiddleware::authenticateAgent();
    $entity = $_GET['entity'] ?? 'properties';

    $samples = [
      'properties' => [
        'headers' => ['title','type','purpose','price','beds','baths','area','city','community','description','agent_email'],
        'rows' => [
          ['Luxury 3-Bed Apartment','apartment','rent','3500000','3','2','120','Lagos','Lekki Phase 1','Beautiful apartment','agent@example.com'],
          ['4-Bed Duplex','villa','buy','85000000','4','4','350','Abuja','Maitama','Spacious duplex','agent@example.com'],
        ],
      ],
      'users' => [
        'headers' => ['name','email','password','role'],
        'rows' => [
          ['John Doe','john@example.com','password123','agent'],
          ['Jane Smith','jane@example.com','password123','user'],
        ],
      ],
      'agents' => [
        'headers' => ['name','email','phone','agency','city','state'],
        'rows' => [
          ['John Doe','john@example.com','08012345678','AVR Homes','Lagos','Lagos'],
          ['Jane Smith','jane@example.com','08087654321','AVR Homes','Abuja','FCT'],
        ],
      ],
    ];

    $spec = $samples[$entity] ?? $samples['properties'];
    self::outputCsv($entity . '-sample.csv', $spec['headers'], $spec['rows']);
  }

  /* ── Import Properties ─────────────────────────────────── */

  public static function importProperties(): void
  {
    AuthMiddleware::authenticateAgent();
    $db = Database::getConnection();

    if (! isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
      Response::error('CSV file required', 400); return;
    }

    $fp = fopen($_FILES['file']['tmp_name'], 'r');
    $header = fgetcsv($fp);
    if (! $header) { fclose($fp); Response::error('Empty CSV', 400); return; }
    $h = array_map('strtolower', $header);

    $required = ['title', 'type', 'purpose', 'price'];
    $missing = array_diff($required, $h);
    if ($missing) { fclose($fp); Response::error('Missing columns: ' . implode(', ', $missing), 400); return; }

    $inserted = 0; $updated = 0; $errors = [];
    $stmt = $db->prepare(
      "INSERT INTO properties (title, slug, description, type, purpose, price, beds, baths, area,
        city, community, address, is_active, agent_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())"
    );

    $line = 1;
    while (($row = fgetcsv($fp)) !== false) {
      $line++;
      $vals = array_pad($row, count($h), '');
      $data = array_combine($h, $vals);

      if (empty($data['title']) || empty($data['type']) || empty($data['purpose']) || empty($data['price'])) {
        $errors[] = "Line {$line}: missing required fields"; continue;
      }

      $slug = $data['slug'] ?? strtolower(trim(preg_replace('/[^a-zA-Z0-9-]+/', '-', $data['title'])));
      $agentId = null;
      if (! empty($data['agent_email'])) {
        $aStmt = $db->prepare("SELECT id FROM agents WHERE email = ? LIMIT 1");
        $aStmt->execute([$data['agent_email']]);
        $agentId = $aStmt->fetchColumn() ?: null;
      }

      try {
        $stmt->execute([
          $data['title'], $slug,
          $data['description'] ?? '', $data['type'], $data['purpose'],
          (int)$data['price'], (int)($data['beds'] ?? 0), (int)($data['baths'] ?? 0),
          (int)($data['area'] ?? 0), $data['city'] ?? '', $data['community'] ?? '',
          $data['address'] ?? '', $agentId,
        ]);
        $inserted++;
      } catch (Exception $e) {
        $errors[] = "Line {$line}: " . $e->getMessage();
      }
    }

    fclose($fp);
    if ($errors) {
      Response::success(['inserted' => $inserted, 'updated' => $updated, 'errors' => $errors],
        "Imported {$inserted} properties with " . count($errors) . " errors");
    } else {
      Response::success(['inserted' => $inserted, 'updated' => $updated],
        "Successfully imported {$inserted} properties");
    }
  }

  /* ── Import Users ──────────────────────────────────────── */

  public static function importUsers(): void
  {
    AuthMiddleware::authenticateAgent();
    $db = Database::getConnection();

    if (! isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
      Response::error('CSV file required', 400); return;
    }

    $fp = fopen($_FILES['file']['tmp_name'], 'r');
    $header = fgetcsv($fp);
    if (! $header) { fclose($fp); Response::error('Empty CSV', 400); return; }
    $h = array_map('strtolower', $header);

    $required = ['name', 'email', 'password'];
    $missing = array_diff($required, $h);
    if ($missing) { fclose($fp); Response::error('Missing columns: ' . implode(', ', $missing), 400); return; }

    $inserted = 0; $errors = [];
    $stmt = $db->prepare("INSERT IGNORE INTO users (name, email, password, role, is_active, created_at) VALUES (?, ?, ?, ?, 1, NOW())");

    $line = 1;
    while (($row = fgetcsv($fp)) !== false) {
      $line++;
      $vals = array_pad($row, count($h), '');
      $data = array_combine($h, $vals);

      if (empty($data['name']) || empty($data['email']) || empty($data['password'])) {
        $errors[] = "Line {$line}: missing required fields"; continue;
      }

      try {
        $stmt->execute([
          $data['name'], $data['email'],
          password_hash($data['password'], PASSWORD_DEFAULT),
          $data['role'] ?? 'user',
        ]);
        if ($stmt->rowCount() > 0) $inserted++;
        else $errors[] = "Line {$line}: duplicate email";
      } catch (Exception $e) {
        $errors[] = "Line {$line}: " . $e->getMessage();
      }
    }

    fclose($fp);
    Response::success(['inserted' => $inserted, 'errors' => $errors],
      "Imported {$inserted} users");
  }

  /* ── Import Agents ─────────────────────────────────────── */

  public static function importAgents(): void
  {
    AuthMiddleware::authenticateAgent();
    $db = Database::getConnection();

    if (! isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
      Response::error('CSV file required', 400); return;
    }

    $fp = fopen($_FILES['file']['tmp_name'], 'r');
    $header = fgetcsv($fp);
    if (! $header) { fclose($fp); Response::error('Empty CSV', 400); return; }
    $h = array_map('strtolower', $header);

    $required = ['name', 'email', 'phone'];
    $missing = array_diff($required, $h);
    if ($missing) { fclose($fp); Response::error('Missing columns: ' . implode(', ', $missing), 400); return; }

    $inserted = 0; $errors = [];
    $stmt = $db->prepare(
      "INSERT INTO agents (name, email, phone, agency, city, state, avatar_hue, is_active, is_verified, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, NOW())"
    );

    $line = 1;
    while (($row = fgetcsv($fp)) !== false) {
      $line++;
      $vals = array_pad($row, count($h), '');
      $data = array_combine($h, $vals);

      if (empty($data['name']) || empty($data['email']) || empty($data['phone'])) {
        $errors[] = "Line {$line}: missing required fields"; continue;
      }

      try {
        $stmt->execute([
          $data['name'], $data['email'], $data['phone'],
          $data['agency'] ?? 'AVR Homes',
          $data['city'] ?? '', $data['state'] ?? '',
          random_int(0, 360),
        ]);
        $inserted++;
      } catch (Exception $e) {
        if (str_contains($e->getMessage(), 'Duplicate')) {
          $errors[] = "Line {$line}: duplicate email";
        } else {
          $errors[] = "Line {$line}: " . $e->getMessage();
        }
      }
    }

    fclose($fp);
    Response::success(['inserted' => $inserted, 'errors' => $errors],
      "Imported {$inserted} agents");
  }
}
