<?php
require_once '../../php/database.php';
$myself = 'https://judge.directdemocracy.vote';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: content-type");
$mysqli = new mysqli($database_host, $database_username, $database_password, $database_name);
if ($mysqli->connect_errno)
  die("{\"error\":\"Failed to connect to MySQL database: $mysqli->connect_error ($mysqli->connect_errno)\"}");
$mysqli->set_charset('utf8mb4');
if (!isset($_GET['key']))
  die("\"error\":\"Missing key argument\"}");

$response = file_get_contents("$myself/ajax/endorse.php");

$key = $mysqli->escape_string($_GET['key']);
$query = "SELECT reputation, endorsed FROM participant WHERE `key`='$key'";
$result = $mysqli->query($query) or die("{\"error\":\"$mysqli->error\"}");
$participant = $result->fetch_assoc();
if ($participant) {
  $reputation = floatval($participant['reputation']);
  $endorsed = $participant['endorsed'] == '1' ? 'true' : 'false';
} else {
  $reputation = 0;
  $endorsed = 'false';
}
$query = "SELECT COUNT(*) AS N FROM participant";
$result = $mysqli->query($query) or error($mysqli->error);
$count = $result->fetch_assoc();
$N = intval($count['N']);
$reputation *= $N;
die("{\"reputation\":$reputation,\"endorsed\":$endorsed}");
?>
