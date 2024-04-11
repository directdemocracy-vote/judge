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

$proposal = json_decode(file_get_contents("php://input"));
if (!$proposal)
  error("Unable to parse proposal");
$type = $proposal->type;
if ($type !== 'referendum && $type !== 'petition')
  error("Unsupported type: $type");
$area = $mysqli->escape_string($proposal->area);
$title = $mysqli->escape_string($proposal->title);
$description = $mysqli->escape_string($proposal->description);
$question = $mysqli->escape_string($proposal->question);
$answers = $mysqli->escape_string($proposal->answers);
$secret = $proposal->answer ? 1 : 0;
$publication = intval($proposal->publication);
$deadline = intval($proposal->deadline);
$trust = intval($proposal->trust);
$website = $mysqli->escape_string($proposal->website);
$email = $mysqli->escape_string($proposal->email);
$query = "INSERT INTO proposal(type, area, title, description, question, answers, secret, publication, deadline, trust, website, email) "
        ."VALUES('$type', \"$area\", \"$title\", \"$description\", \"$question\", \"answers\", $secret, FROM_UNIXTIME($publication), FROM_UNIXTIME($deadline), $trust, "
        ."\"$website\", \"$email\")";
$result = $mysqli->query($query) or error($mysqli->error);

die('{"status":"OK"}');
?>
