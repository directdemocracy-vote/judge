<?php
require_once '../../php/header.php';
require_once '../../php/database.php';

function error($message) {
  if ($message[0] != '{')
    $message = '"'.$message.'"';
  die("{\"error\":$message}");
}

if (!isset($_GET['reference']))
  error('Missing reference parameter');
$reference = $mysqli->escape_string($_GET['reference']);
$query = "SELECT type, area, title, description, question, answers, secret, UNIX_TIMESTAMP(publication) AS publication, "
        ."UNIX_TIMESTAMP(deadline) AS deadline, trust, website, email, language, countryCode, timeZone, timeZoneOffset "
        ."FROM proposal WHERE reference=UNHEX('$reference')";
$result = $mysqli->query($query) or error($mysqli->error);
$proposal = $result->fetch_assoc();
$result->free();
if (!$proposal)
  error('Proposal not found');
$proposal['publication'] = intval($proposal['publication']);
$proposal['deadline'] = intval($proposal['deadline']);
$proposal['trust'] = intval($proposal['trust']);
$proposal['timeZoneOffset'] = intval($proposal['timeZoneOffset']);
$proposal['secret'] = $proposal['secret'] === 1;
die(json_encode($proposal, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
?>
