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

$last_update = 0;

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

# compute the initial reputation value from the number of entities
$query = "SELECT COUNT(*) AS N FROM entity";
$result = $mysqli->query($query) or error($mysqli->error);
$count = $result->fetch_assoc();
$N = intval($count['N']);
if ($N==0)
  $initial = 1.0;
else
  $initial = 1.0 / $N;

# we assume the station already checked
foreach($endorsements as $endorsement) {
  $query = "SELECT id FROM entity WHERE `key`='$endorsement->key'";
  $result = $mysqli->query($query) or error($mysqli->error);
  if (!$result->num_rows) {
    $query = "INSERT IGNORE INTO entity(`key`, reputation) VALUES('$endorsement->key', $initial)";
    $mysqli->query($query) or error("$query $mysqli->error");
    $endorser = $mysqli->insert_id;
  } else {
    $row = $result->fetch_assoc();
    $endorser = $row['id'];
  }
  $query = "SELECT id FROM entity WHERE `key`='$endorsement->key'";
  $result = $mysqli->query($query) or error($mysqli->error);
  if (!$result->num_rows) {
    $query = "INSERT IGNORE INTO entity(`key`, reputation) VALUES('$endorsement->key', $initial)";
    $mysqli->query($query) or error($mysqli->error);
    $endorsed = $mysqli->insert_id;
  } else {
    $row = $result->fetch_assoc();
    $endorsed = $row['id'];
  }
  $mysqli->query($query) or error($mysqli->error);
  if (isset($endorsement->revoke) && $endorsement->revoke)
    $query = "DELETE FROM link WHERE endorser=$endorser AND endorsed=$endorsed";
  else
    $query = "INSERT INTO link(endorser, endorsed, published, expires) "
            ."VALUES($endorser, $endorsed, $endorsement->published, $endorsement->expires) "
            ."ON DUPLICATE KEY UPDATE published=$endorsement->published, expires=$endorsement->expires";
  $mysqli->query($query) or error($mysqli->error);
}

# cleanup entities
# $query = "DELETE entity FROM entity LEFT JOIN link ON link.endorsed=entity.id WHERE endorsed IS NULL";
# $mysqli->query($query) or error($mysqli->error);

# run page rank algorithm, see https://en.wikipedia.org/wiki/PageRank
$d = 0.85;  # d is the damping parameter (default value is 0.85)

# N is the new total number of entities
$query = "SELECT COUNT(*) AS N FROM entity";
$result = $mysqli->query($query) or error($mysqli->error);
$count = $result->fetch_assoc();
$N = intval($count['N']);

$debug = '';

for($i = 0; $i < 13; $i++) {  # supposed to converge in about 13 iterations
  $query = "SELECT id FROM entity";
  $result = $mysqli->query($query) or error($mysqli->error);
  while($entity = $result->fetch_assoc()) {
    $id = intval($entity['id']);
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
      $query = "SELECT reputation FROM entity WHERE id=$endorser";
      $r1 = $mysqli->query($query) or error($mysqli->error);
      $e = $r1->fetch_assoc();
      $PRj = floatval($e['reputation']);
      $r1->free();
      $sum += $PRj / $Lj;
    }
    $r0->free();
    $PR = (1 - $d) / $N + $d * $sum;
    $query = "UPDATE entity SET reputation=$PR WHERE id=$id";
    $mysqli->query($query) or error($mysqli->error);
  }
}

$threshold = 1.0 / $N;
$count = 0;
$table = '';
$query = "SELECT id, reputation, `key` FROM entity WHERE reputation > 0";
$result = $mysqli->query($query) or error($mysqli->error);
while($entity = $result->fetch_assoc()) {
  $id = intval($entity['id']);
  $reputation = floatval($entity['reputation']);
  $table .= "$id:\t$reputation\n";
  if ($reputation > $threshold) {
    # publish endorsement for citizen is allowed to vote by this trustee
    $count++;
  }
}

die("endorsed $count citizens out of $N:\n$table");
?>
