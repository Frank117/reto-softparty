<?php
require 'config.php';

try {
    $stmt = $pdo->prepare("
        SELECT 
            p.id AS parking_id,
            p.entry_time,
            v.plate,
            v.vehicle_type,
            o.full_name,
            o.document,
            o.phone
        FROM parkings p
        INNER JOIN vehicles v ON p.vehicle_id = v.id
        INNER JOIN owners o ON v.owner_id = o.id
        WHERE p.exit_time IS NULL
        ORDER BY p.entry_time DESC
    ");
    $stmt->execute();
    $rows = $stmt->fetchAll();

    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($rows);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
