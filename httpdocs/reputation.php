<?php
require_once '../php/database.php';
$myself = 'https://trustee.directdemocracy.vote';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: content-type");
$mysqli = new mysqli($database_host, $database_username, $database_password, $database_name);
if ($mysqli->connect_errno)
  die("{\"error\":\"Failed to connect to MySQL database: $mysqli->connect_error ($mysqli->connect_errno)\"}");
$mysqli->set_charset('utf8mb4');
if (!isset($_GET['key']))
  die("\"error\":\"Missing key argument\"}");

$response = file_get_contents("$myself/endorse.php");

$key = $mysqli->escape_string($_GET['key']);
$query = "SELECT reputation, endorsed FROM entity WHERE `key`='$key'";
$result = $mysqli->query($query) or die("{\"error\":\"$mysqli->error\"}");
$entity = $result->fetch_assoc();
if ($entity) {
  $reputation = floatval($entity['reputation']);
  $endorsed = $entity['endorsed'] == '1' ? 'true' : 'false';
} else {
  $reputation = 0;
  $endorsed = 'false';
}
die("{\"reputation\":$reputation,\"endorsed\":$endorsed}");
?>
