<?php
require_once '../../php/database.php';
$myself = 'https://judge.directdemocracy.vote';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: content-type");

if (!isset($_GET['key']))
  die('{"error":"missing key argument"}');

$response = file_get_contents("$myself/api/trust.php");

$key = $mysqli->escape_string($_GET['key']);
$query = "SELECT reputation, trusted FROM participant WHERE `key` = FROM_BASE64('$key==')";
$result = $mysqli->query($query) or die("{\"error\":\"$mysqli->error\"}");
$participant = $result->fetch_assoc();
if ($participant) {
  $reputation = floatval($participant['reputation']);
  $trusted = $participant['trusted'] == '1' ? 'true' : 'false';
} else {
  $reputation = 0;
  $trusted = 'false';
}
if (!isset($_GET['challenge']))
  die("{\"reputation\":$reputation,\"trusted\":$trusted}");
$challenge = base64_decode($mysqli->escape_string($_GET['challenge']));
$private_key = openssl_get_privatekey("file://../../id_rsa");
if ($private_key == FALSE)
  die('{"error":"failed to read private key"}');
$signature = '';
$success = openssl_sign($challenge, $signature, $private_key, OPENSSL_ALGO_SHA256);
if ($success === FALSE)
  die('{"error": "failed to sign area"}');
$base64_signature = base64_encode($signature);
$timestamp = time();
die("{\"reputation\":$reputation,\"trusted\":$trusted,\"signature\":\"$base64_signature\",\"timestamp\":$timestamp}");
?>
