<?php
// Datos de conexión a MySQL (XAMPP por defecto)
$DB_HOST = '127.0.0.1';
$DB_NAME = 'sispark';
$DB_USER = 'root';
$DB_PASS = ''; 
$DB_CHARSET = 'utf8mb4';

// DSN para PDO
$dsn = "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=$DB_CHARSET";

$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, // Manejo de errores con excepciones
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, // Resultados como array asociativo
    PDO::ATTR_EMULATE_PREPARES => false, // Consultas preparadas reales
];

try {
    $pdo = new PDO($dsn, $DB_USER, $DB_PASS, $options);
    // echo "✅ Conexión exitosa a la base de datos sispark"; // descomenta para probar
} catch (PDOException $e) {
    die("❌ Error de conexión: " . $e->getMessage());
}
