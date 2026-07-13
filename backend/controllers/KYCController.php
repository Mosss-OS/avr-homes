<?php

declare(strict_types=1);

class KYCController
{
  private static function auth(): array
  {
    return AuthMiddleware::authenticate();
  }

  public static function status(): void
  {
    $user = self::auth();
    $db = Database::getConnection();

    $stmt = $db->prepare('SELECT * FROM kyc_records WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $record = $stmt->fetch();

    if (!$record) {
      Response::success([
        'status' => 'not_submitted',
        'bvn_verified' => false,
        'id_verified' => false,
      ]);
      return;
    }

    $record['id'] = (int)$record['id'];
    $record['user_id'] = (int)$record['user_id'];
    $record['bvn_verified'] = (bool)$record['bvn_verified'];
    $record['id_verified'] = (bool)$record['id_verified'];
    $record['accredited_investor'] = (bool)$record['accredited_investor'];

    Response::success($record);
  }

  public static function submit(): void
  {
    $user = self::auth();

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    $validator = new Validator($input);
    $validator
      ->string('bvn_number', 'BVN Number', 11)
      ->string('source_of_funds', 'Source of Funds', 1000);

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();
    $db = Database::getConnection();

    $stmt = $db->prepare('SELECT id FROM kyc_records WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $existing = $stmt->fetch();

    if ($existing) {
      $stmt = $db->prepare(
        'UPDATE kyc_records SET bvn_number = ?, source_of_funds = ?, status = "pending",
         id_document_url = ?, id_document_type = ?, accredited_investor = ?
         WHERE user_id = ?'
      );
      $stmt->execute([
        $data['bvn_number'] ?? null,
        $data['source_of_funds'] ?? null,
        $input['id_document_url'] ?? null,
        $input['id_document_type'] ?? null,
        !empty($input['accredited_investor']) ? 1 : 0,
        $user['id'],
      ]);
      Response::success(null, 'KYC updated');
    } else {
      $stmt = $db->prepare(
        'INSERT INTO kyc_records (user_id, bvn_number, source_of_funds, id_document_url, id_document_type, accredited_investor, status)
         VALUES (?, ?, ?, ?, ?, ?, "pending")'
      );
      $stmt->execute([
        $user['id'],
        $data['bvn_number'] ?? null,
        $data['source_of_funds'] ?? null,
        $input['id_document_url'] ?? null,
        $input['id_document_type'] ?? null,
        !empty($input['accredited_investor']) ? 1 : 0,
      ]);
      Response::success(null, 'KYC submitted', 201);
    }
  }
}
