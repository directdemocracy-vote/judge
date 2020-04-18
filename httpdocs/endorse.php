<?php
require_once '../php/database.php';

$publisher = 'https://publisher.directdemocracy.vote';

function error($message) {
  if ($message[0] != '{')
    $message = '"'.$message.'"';
  die("{\"error\":$message}");
}

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: content-type");
$mysqli = new mysqli($database_host, $database_username, $database_password, $database_name);
if ($mysqli->connect_errno)
  error("Failed to connect to MySQL database: $mysqli->connect_error ($mysqli->connect_errno)");
$mysqli->set_charset('utf8mb4');

$query = "SELECT lastUpdate FROM status";
$result = $mysqli->query($query) or error($mysqli->error);
$status = $result->fetch_assoc();
$result->free();
$last_update = floatval($status['lastUpdate']);

$options = array('http' => array('method' => 'GET',
                                 'header' => "Content-Type: application/json\r\nAccept: application/json\r\n"));
$url = "$publisher/publications.php?type=endorsement&published_from=$last_update";
$response = file_get_contents($url, false, stream_context_create($options));

$endorsements = json_decode($response);
if (isset($endorsements->error))
  error($endorsements->error);

$now = floatval(microtime(true) * 1000);  # milliseconds
$query = "UPDATE status SET lastUpdate=$now";
$mysqli->query($query) or error($mysqli->error);

# remove expired links
$query = "DELETE FROM link WHERE expires < $now";
$mysqli->query($query) or error($mysqli->error);

# we assume the station already checked
foreach($endorsements as $endorsement) {
  $query = "SELECT id FROM entity WHERE `key`='$endorsement->key'";
  $result = $mysqli->query($query) or error($mysqli->error);
  if (!$result->num_rows) {
    $query = "INSERT INTO entity(`key`) VALUES('$endorsement->key')";
    $mysqli->query($query) or error("$query $mysqli->error");
    $endorser = $mysqli->insert_id;
  } else {
    $row = $result->fetch_assoc();
    $endorser = $row['id'];
  }
  $query = "SELECT id FROM entity WHERE `key`='$endorsement->key'";
  $result = $mysqli->query($query) or error($mysqli->error);
  if (!$result->num_rows) {
    $query = "INSERT INTO entity(`key`) VALUES('$endorsement->key')";
    $mysqli->query($query) or error($mysqli->error);
    $endorsed = $mysqli->insert_id;
    $query = "INSERT INTO reputation(id, level) VALUES($endorsed, 1)";
    $mysqli->query($query) or error($mysqli->error);
  } else {
    $row = $result->fetch_assoc();
    $endorsed = $row['id'];
  }
  if (isset($endorsement->revoke) && $endorsement->revoke)
    $query = "DELETE FROM link WHERE endorser=$endorser AND endorsed=$endorsed";
  else
    $query = "INSERT INTO link(endorser, endorsed, published, expires) "
            ."VALUES($endorser, $endorsed, $endorsement->published, $endorsement->expires) "
            ."ON DUPLICATE KEY UPDATE published=$endorsement->published, expires=$endorsement->expires";
  $mysqli->query($query) or error($mysqli->error);
}

# run page rank algorithm, see https://en.wikipedia.org/wiki/PageRank
$d = 0.85;  # d is the damping parameter (default value is 0.85)

# N is the total number of entities
$query = "SELECT COUNT(*) AS N FROM entity";
$result = $mysqli->query($query) or error($mysqli->error);
$count = $result->fetch_assoc();
$N = $count['N'];

for($i = 0; $i < 13; $i++) {  # supposed to converge in about 13 iterations
  $query = "SELECT id, level FROM reputation";
  $result = $mysqli->query($query) or error($mysqli->error);
  while($reputation = $result->fetch_assoc()) {
    $id = intval($reputation['id']);
    $level = floatval($reputation['level']);
    $query = "SELECT endorser FROM link WHERE endorsed=$id";
    $r0 = $mysqli->query($query) or error($mysqli->error);
    $sum = 0;
    while($link = $r0->fetch_assoc()) {
      $endorser = $link['endorser'];
      $query = "SELECT COUNT(*) AS c FROM link WHERE endorser=$endorser";
      $r1 = $mysqli->query($query) or error($mysqli->error);
      $count = $r1->fetch_assoc();
      $Lj = intval($count['c']);
      $r1->free();
      $query = "SELECT level FROM reputation WHERE id=$endorser";
      $r1 = $mysqli->query($query) or error($mysqli->error);
      $level = $r1->fetch_assoc();
      $PRj = floatval($level['level']);
      $r1->free();
      $sum += $PRj / $Lj;
    }
    $r0->free();
    $PR = (1 - $d) / $N + $d * $sum;
    $query = "UPDATE reputation SET level=$PR WHERE id=$endorsed";
  }
}

$count = 0;
$query = "SELECT reputation.level, entity.`key` FROM reputation LEFT JOIN entity ON entity.id=reputation.id";
$result = $mysqli->query($query) or error($mysqli->error);
while($reputation = $result->fetch_assoc()) {
  $id = intval($reputation['key']);
  $level = floatval($reputation['level']);
  if ($level > 1) {
    # publish endorsement for citizen is allowed to vote by this trustee
    $count++;
  }
}
die("endorsed $count citizens");
?>
