<?php
require_once '../../php/database.php';
$myself = 'https://judge-1.directdemocracy.vote';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: content-type");

if (!isset($_GET['key']))
  die("\"error\":\"Missing key argument\"}");

$response = file_get_contents("$myself/api/endorse.php");
die($response);
$key = $mysqli->escape_string($_GET['key']);
$query = "SELECT reputation, endorsed FROM participant WHERE `key` = FROM_BASE64('$key')";
$result = $mysqli->query($query) or die("{\"error\":\"$mysqli->error\"}");
$participant = $result->fetch_assoc();
if ($participant) {
  $reputation = floatval($participant['reputation']);
  $endorsed = $participant['endorsed'] == '1' ? 'true' : 'false';
} else {
  $reputation = -1;
  $endorsed = 'false';
}

die("{\"reputation\":$reputation,\"endorsed\":$endorsed}");
?>
