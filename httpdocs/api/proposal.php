<?php

require_once '../../php/database.php';

function error($message) {
  if ($message[0] != '{')
    $message = '"'.$message.'"';
  die("{\"error\":$message}");
}

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: content-type");

if (!isset($_GET['reference']))
  error('Missing reference parameter');
$reference = $mysqli->escape_string($_GET['reference']);
$query = "SELECT type, area, title, description, question, answers, secret, UNIX_TIMESTAMP(publication), "
        ."UNIX_TIMESTAMP(deadline), trust, website, email, language FROM proposal WHERE reference='$reference'";
$result = $mysqli->query($query) or error($mysqli->error);
$proposal = $result->fetch_assoc();
$result->free();
die('{"proposal":{'.json_encode($proposal, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE).'}}');
?>
