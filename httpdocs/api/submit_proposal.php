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
if ($type !== 'referendum' && $type !== 'petition')
  error("Unsupported type: $type");
$area = $mysqli->escape_string($proposal->area);
$title = $mysqli->escape_string($proposal->title);
$description = $mysqli->escape_string($proposal->description);
$question = $mysqli->escape_string($proposal->question);
$answers = $mysqli->escape_string($proposal->answers);
$secret = $proposal->secret ? 1 : 0;
$publication = intval($proposal->publication);
$deadline = intval($proposal->deadline);
$trust = intval($proposal->trust);
$website = $mysqli->escape_string($proposal->website);
$email = $mysqli->escape_string($proposal->email);
$language = $mysqli->escape_string($proposal->language);
$countryCode = $mysqli->escape_string($proposal->countryCode);
$timeZone = $mysqli->escape_string($proposal->timeZone);
$timeZoneOffset = intval($proposal->timeZoneOffset);
if (isset($proposal->reference)) {
  $reference = $mysqli->escape_string($proposal->reference);
  $query = "UPDATE proposal SET type='$type', area=\"$area\", title=\"$title\", description=\"$description\", question=\"$question\", "
          ."answers=\"$answers\", secret=$secret, publication=FROM_UNIXTIME($publication), deadline=FROM_UNIXTIME($deadline), "
          ."trust=$trust, website=\"$website\", email=\"$email\", language=\"$language\", countryCode=\"$countryCode\", timeZone=\"$timeZone\", timeZoneOffset=$timeZoneOffset "
          ."WHERE reference=UNHEX('$reference')";
} else {
  $reference = bin2hex(random_bytes(20));
  $query = "INSERT INTO proposal(reference, type, area, title, description, question, answers, secret, publication, deadline, trust, website, email, language, countryCode, timeZone, timeZoneOffset) "
          ."VALUES(UNHEX('$reference'), '$type', \"$area\", \"$title\", \"$description\", \"$question\", \"$answers\", $secret, "
          ."FROM_UNIXTIME($publication), FROM_UNIXTIME($deadline), $trust, \"$website\", \"$email\", \"$language\", \"$countryCode\", \"$timeZone\", $timeZoneOffset)";
}
$result = $mysqli->query($query) or error($mysqli->error);
$url = "https://judge.directdemocracy.vote/propose.html?reference=$reference";
$link = "<a href=\"$url\">$url</a>";
$areas = explode("\n", $area);
foreach ($areas as &$a) {
  $as = explode('=', $a);
  $a = $as[1];
}
$area = join(' &ndash; ', $areas);
$answers = str_replace("\\n", ' &ndash; ', $answers);
$title = str_replace("\\'", "'", $title);
$description = str_replace("\\'", "'", $description);
$question = str_replace("\\'", "'", $question);
date_default_timezone_set($timeZone);
$publication = date('Y-m-d H:i:s', $publication);
$deadline = date('Y-m-d H:i:s', $deadline);
if ($trust === 0)
  $trust = 'immediate';
elseif ($trust === 86400)
  $trust = 'one day';
elseif ($trust === 259200)
  $trust = 'three days';
elseif ($trust === 604800)
  $trust = 'one week';
else
  $trust = 'unsupported';
$message = "Dear citizen,<br><br>"
          ."Thank you for submitting a proposal to judge.directdemocracy.vote!<br>"
          ."We will review your proposal and revert back to you about it very soon.<br>"
          ."Meanwhile, you can still make modifications to your proposal from here:<br>"
          ."$link<br>"
          ."If you have any question regarding your proposal, please contact us by replying to this e-mail.<br><br>"
          ."Best regards,";
$message.= "<br><br>judge.directdemocracy.vote<br><br>"
          ."<hr>"
          ."<b>Type</b>: $type<br>\n"
          ."<b>Area</b>: $area<br>\n"
          ."<b>Title</b>: $title<br>\n"
          ."<b>Description</b>:<br>$description<br>\n";
if ($type === 'referendum')
  $message.= "<b>Question</b>: $question<br>\n"
            ."<b>Answers</b>: $answers<br>\n";
if ($website)
  $message.= "<b>Web site</b>: $website<br>\n";
$message.= "<b>Publication date</b>: $publication <small>($timeZone)</small><br>\n"
          ."<b>Deadline</b>: $deadline <small>($timeZone)</small><br>\n"
          ."<b>Trust delay</b>: $trust<br>\n"
          ."<b>E-mail</b>: $email<br><br>\n";
$headers = "From: judge@directdemocracy.vote\r\n"
          ."X-Mailer: php\r\n"
          ."MIME-Version: 1.0\r\n"
          ."Content-Type: text/html; charset=UTF-8\r\n"
          ."Bcc: judge@directdemocracy.vote\r\n";
mail($email, "New proposal: $title", $message, $headers);
die('{"reference":"$reference"}');
?>
