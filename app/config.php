<?php
$DB_HOST = "localhost";
$DB_NAME = "sispark";
$DB_USER = "root";   // usuario por defecto de XAMPP
$DB_PASS = "";       // contraseña vacía por defecto
$DB_CHARSET = "utf8mb4";

try {
    $pdo = new PDO(
        "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=$DB_CHARSET",
        $DB_USER,
        $DB_PASS
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // echo "✅ Conexión exitosa";
} catch (PDOException $e) {
    die("❌ Error de conexión: " . $e->getMessage());
}
?>
