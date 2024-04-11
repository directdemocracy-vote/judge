<?php
function error($message) {
  if ($message[0] != '{')
    $message = '"'.$message.'"';
  die("{\"error\":$message}");
}



header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: content-type");

$proposal = json_decode(file_get_contents("php://input"));
if (!$proposal)
  error("Unable to parse proposal");

die('{"status":"OK"}');
?>
