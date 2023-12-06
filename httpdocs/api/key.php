<?php
function stripped_key($public_key) {
  $stripped = str_replace("-----BEGIN PUBLIC KEY-----", "", $public_key);
  $stripped = str_replace("-----END PUBLIC KEY-----", "", $stripped);
  $stripped = str_replace(array("\r", "\n", '='), '', $stripped);
  return substr($stripped, 44, -6);
}
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: content-type");
$public_key_file = fopen("../../id_rsa.pub", "r") or die("{\"error\":\"unable to open public key file\"}");
$k = fread($public_key_file, filesize("../../id_rsa.pub"));
fclose($public_key_file);
$key = stripped_key($k);
die("{\"key\":\"$key\"}");
?>
