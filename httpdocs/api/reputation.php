<?php
require_once '../../php/database.php';
$myself = 'https://judge.directdemocracy.vote';

function stripped_key($public_key) {
  $stripped = str_replace("-----BEGIN PUBLIC KEY-----", "", $public_key);
  $stripped = str_replace("-----END PUBLIC KEY-----", "", $stripped);
  $stripped = str_replace(array("\r", "\n", '='), '', $stripped);
  return substr($stripped, 44, -6);
}

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: content-type");

if (!isset($_GET['key']))
  die('{"error":"missing key argument"}');

$response = file_get_contents("$myself/api/trust.php");

$key = $mysqli->escape_string($_GET['key']);
$query = "SELECT reputation, trusted, UNIX_TIMESTAMP(issued) AS issued FROM participant WHERE `key` = FROM_BASE64('$key==')";
$result = $mysqli->query($query) or die("{\"error\":\"$mysqli->error\"}");
$participant = $result->fetch_assoc();
$answer = [];
if ($participant) {
  $answer['reputation'] = floatval($participant['reputation']);
  $answer['trusted'] = $participant['trusted'] == '1' ? 1 : -1;
  $answer['issued'] = intval($participant['issued']);
} else {
  $answer['reputation'] = 0;
  $answer['trusted'] = 0;
  $answer['issued'] = 0;
}
$answer['timestamp'] = time();
$answer['signature'] = '';
$public_key_file = fopen("../../id_rsa.pub", "r") or die("Failed to read public key file");
$k = fread($public_key_file, filesize("../../id_rsa.pub"));
fclose($public_key_file);
$answer['key'] = stripped_key($k);
$private_key = openssl_get_privatekey("file://../../id_rsa");
if ($private_key == FALSE)
  die('{"error":"failed to read private key"}');
$signature = '';
$data = json_encode($answer, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
$success = openssl_sign($data, $signature, $private_key, OPENSSL_ALGO_SHA256);
if ($success === FALSE)
  die('{"error": "failed to sign reputation"}');
$answer['signature'] = substr(base64_encode($signature), 0, -2);
die(json_encode($answer, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
?>
