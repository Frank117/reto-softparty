<?php
require 'config.php';

// Recibir el ID del registro de parqueo (parking_id)
$parking_id = intval($_POST['parking_id'] ?? 0);

if (!$parking_id) {
    http_response_code(400);
    echo json_encode(['error' => 'ID de registro inválido']);
    exit;
}

// Obtener tarifa y moneda desde settings
$stmt = $pdo->query("SELECT hourly_rate, currency FROM settings ORDER BY id DESC LIMIT 1");
$settings = $stmt->fetch();
$tarifa = $settings['hourly_rate'] ?? 3000; // fallback en caso de que no haya settings
$currency = $settings['currency'] ?? 'COP';

try {
    // Buscar registro de parqueo con entrada pero sin salida
    $stmt = $pdo->prepare("
        SELECT p.id, p.entry_time, v.plate, v.vehicle_type, 
               o.full_name, o.document, o.phone
        FROM parkings p
        JOIN vehicles v ON p.vehicle_id = v.id
        JOIN owners o ON v.owner_id = o.id
        WHERE p.id = ? AND p.exit_time IS NULL
    ");
    $stmt->execute([$parking_id]);
    $registro = $stmt->fetch();

    if (!$registro) {
        http_response_code(404);
        echo json_encode(['error' => 'Registro no encontrado o ya facturado']);
        exit;
    }

    $entrada = new DateTime($registro['entry_time']);
    $salida = new DateTime(); // hora actual
    $minutos = ($salida->getTimestamp() - $entrada->getTimestamp()) / 60;
    $minutos = max(1, intval($minutos));

    // Calcular horas redondeando hacia arriba
    $horas = ceil($minutos / 60);
    $total = $horas * $tarifa;

    // Generar número de factura (ejemplo sencillo)
    $invoice_number = "INV-" . date("YmdHis") . "-" . $parking_id;

    // Actualizar registro
    $stmt = $pdo->prepare("
        UPDATE parkings 
        SET exit_time = ?, duration_minutes = ?, amount = ?, invoice_number = ?, pdf_generated = 0 
        WHERE id = ?
    ");
    $stmt->execute([
        $salida->format("Y-m-d H:i:s"),
        $minutos,
        $total,
        $invoice_number,
        $parking_id
    ]);

    echo json_encode([
        'success' => true,
        'parking_id' => $parking_id,
        'invoice_number' => $invoice_number,
        'entry_time' => $entrada->format("Y-m-d H:i:s"),
        'exit_time' => $salida->format("Y-m-d H:i:s"),
        'hours' => $horas,
        'total' => $total,
        'tarifa' => $tarifa,
        'currency' => $currency,
        'vehiculo' => [
            'placa' => $registro['plate'],
            'tipo' => $registro['vehicle_type'],
            'dueño' => $registro['full_name'],
            'documento' => $registro['document'],
            'telefono' => $registro['phone']
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
