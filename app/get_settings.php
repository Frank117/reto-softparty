<?php
require 'config.php';

try {
    $stmt = $pdo->query("SELECT hourly_rate, currency FROM settings ORDER BY id DESC LIMIT 1");
    $settings = $stmt->fetch();
    
    if ($settings) {
        echo json_encode([
            'success' => true,
            'hourly_rate' => $settings['hourly_rate'],
            'currency' => $settings['currency']
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'hourly_rate' => 3000,
            'currency' => 'COP'
        ]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
