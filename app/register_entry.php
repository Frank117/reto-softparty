<?php
require 'config.php';

// Recibir datos
$full_name = $_POST['nombre'] ?? '';
$document = $_POST['documento'] ?? '';
$phone = $_POST['contacto'] ?? '';
$plate = strtoupper(trim($_POST['placa'] ?? ''));
$vehicle_type = $_POST['tipo'] ?? '';
$entry_time = $_POST['entrada'] ?? date('Y-m-d H:i:s');

if (!$full_name || !$document || !$plate || !$vehicle_type) {
    http_response_code(400);
    echo json_encode(['error' => 'Faltan datos obligatorios']);
    exit;
}

try {
    $pdo->beginTransaction();

    // 1. Dueño
    $stmt = $pdo->prepare("SELECT id FROM owners WHERE document = ?");
    $stmt->execute([$document]);
    $owner = $stmt->fetch();

    if (!$owner) {
        $stmt = $pdo->prepare("INSERT INTO owners (full_name, document, phone) VALUES (?, ?, ?)");
        $stmt->execute([$full_name, $document, $phone]);
        $owner_id = $pdo->lastInsertId();
    } else {
        $owner_id = $owner['id'];
    }

    // 2. Vehículo
    $stmt = $pdo->prepare("SELECT id FROM vehicles WHERE plate = ?");
    $stmt->execute([$plate]);
    $vehicle = $stmt->fetch();

    if (!$vehicle) {
        $stmt = $pdo->prepare("INSERT INTO vehicles (owner_id, plate, vehicle_type) VALUES (?, ?, ?)");
        $stmt->execute([$owner_id, $plate, $vehicle_type]);
        $vehicle_id = $pdo->lastInsertId();
    } else {
        $vehicle_id = $vehicle['id'];
    }

    // 3. Parking
    $stmt = $pdo->prepare("INSERT INTO parkings (vehicle_id, entry_time) VALUES (?, ?)");
    $stmt->execute([$vehicle_id, $entry_time]);

    $pdo->commit();

    echo json_encode(['success' => true, 'message' => 'Entrada registrada correctamente']);
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
