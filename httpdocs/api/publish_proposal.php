<?php
$version = "2";
$notary = 'https://notary.directdemocracy.vote';

function error($message) {
  if ($message[0] != '{')
    $message = '"'.$message.'"';
  die("{\"error\":$message}");
}

function stripped_key($public_key) {
  $stripped = str_replace("-----BEGIN PUBLIC KEY-----", "", $public_key);
  $stripped = str_replace("-----END PUBLIC KEY-----", "", $stripped);
  $stripped = str_replace(array("\r", "\n", '='), '', $stripped);
  return substr($stripped, 44, -6);
}

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: content-type");

$proposal = json_decode(file_get_contents("php://input"));
if (!$proposal)
  error("Unable to parse proposal");
if ($proposal->schema != "https://directdemocracy.vote/json-schema/$version/proposal.schema.json")
  error("Wrong schema");

$public_key_file = fopen("../../id_rsa.pub", "r") or die("{\"error\":\"unable to open public key file\"}");
$k = fread($public_key_file, filesize("../../id_rsa.pub"));
fclose($public_key_file);
$proposal->key = stripped_key($k);
$proposal->trust = 3600 * 24 * 7; # at least one week before allow a trusted citizen to vote/sign
$data = json_encode($proposal, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
$private_key = openssl_get_privatekey("file://../../id_rsa");
if ($private_key == FALSE)
  error("Failed to read private key.");
$signature = '';
$success = openssl_sign($data, $signature, $private_key, OPENSSL_ALGO_SHA256);
if ($success === FALSE)
  error("Failed to sign proposal");
$proposal->signature = substr(base64_encode($signature), 0, -2);

# publish proposal
$proposal_data = json_encode($proposal, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
$options = array('http' => array('method' => 'POST',
                                 'content' => $proposal_data,
                                 'header' => "Content-Type: application/json\r\n" .
                                             "Accept: application/json\r\n"));
$response = file_get_contents("$notary/api/publish.php", false, stream_context_create($options));
$json = json_decode($response);
if (isset($json->error))
  error($json->error);
die("{\"signature\":\"$proposal->signature\"}");
?>
