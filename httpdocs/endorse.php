<?php
require_once '../php/database.php';

$version = '0.0.1';
$publisher = 'https://publisher.directdemocracy.vote';

function error($message) {
  if ($message[0] != '{')
    $message = '"'.$message.'"';
  die("{\"error\":$message}");
}

function stripped_key($public_key) {
  $stripped = str_replace("-----BEGIN PUBLIC KEY-----", "", $public_key);
  $stripped = str_replace("-----END PUBLIC KEY-----", "", $stripped);
  $stripped = str_replace("\r\n", '', $stripped);
  $stripped = str_replace("\n", '', $stripped);
  return $stripped;
}

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: content-type");
$mysqli = new mysqli($database_host, $database_username, $database_password, $database_name);
if ($mysqli->connect_errno)
  error("Failed to connect to MySQL database: $mysqli->connect_error ($mysqli->connect_errno)");
$mysqli->set_charset('utf8mb4');

$now = intval(microtime(true) * 1000);  # milliseconds

$query = "SELECT lastUpdate FROM status";
$result = $mysqli->query($query) or error($mysqli->error);
$status = $result->fetch_assoc();
$result->free();
$last_update = floatval($status['lastUpdate']);

$update_every = 10;
if ($last_update + $update_every * 1000 > $now)
  die("Updated in the last $update_every seconds");

$query = "UPDATE status SET lastUpdate=$now";
$mysqli->query($query) or error($mysqli->error);

# compute the initial reputation value from the number of entities
$query = "SELECT COUNT(*) AS N FROM entity";
$result = $mysqli->query($query) or error($mysqli->error);
$count = $result->fetch_assoc();
$N = intval($count['N']);
if ($N==0) {
  $initial = 1.0;
  $last_update = 0; // the database was likely wiped out
} else
  $initial = 1.0 / $N;

$options = array('http' => array('method' => 'GET',
                                 'header' => "Content-Type: application/json\r\nAccept: application/json\r\n"));
$url = "$publisher/publications.php?type=endorsement&published_from=$last_update";
$response = file_get_contents($url, false, stream_context_create($options));
$endorsements = json_decode($response);
if (isset($endorsements->error))
  error($endorsements->error);

$public_key_file = fopen("../id_rsa.pub", "r") or error("Failed to read public key file");
$k = fread($public_key_file, filesize("../id_rsa.pub"));
fclose($public_key_file);
$public_key = stripped_key($k);

# remove expired entities and links
$query = "DELETE FROM entity WHERE expires < $now";
$mysqli->query($query) or error($mysqli->error);
$query = "DELETE FROM link WHERE NOT EXISTS (SELECT NULL FROM entity WHERE id=endorser OR id=endorsed)";
$mysqli->query($query) or error($mysqli->error);

# insert endorser and endorsed in entities, links
foreach($endorsements as $endorsement) {
  if ($endorsement->key == $public_key)  # ignore mine
    continue;
  $query = "SELECT id FROM entity WHERE `key`='$endorsement->key'";  # endorser
  $result = $mysqli->query($query) or error($mysqli->error);
  if (!$result->num_rows) {
    $query = "INSERT IGNORE INTO entity(`key`, signature, reputation, endorsed, expires, changed) "
            ."VALUES('$endorsement->key', '', $initial, 0, 0, 0) ";
    $mysqli->query($query) or error("$query $mysqli->error");
    $endorser = $mysqli->insert_id;
  } else {
    $row = $result->fetch_assoc();
    $endorser = $row['id'];
  }
  $key = $endorsement->publication->key;
  $signature = $endorsement->publication->signature;
  $query = "SELECT id FROM entity WHERE `key`='$key' AND signature='$signature'";
  $result = $mysqli->query($query) or error($mysqli->error);
  if (!$result->num_rows) {
    $query = "INSERT INTO entity(`key`, signature, reputation, endorsed, expires, changed) "
            ."VALUES('$key', '$signature', $initial, 0, $endorsement->expires, 0) "
            ."ON DUPLICATE KEY UPDATE signature='$signature', expires=$endorsement->expires";
    $mysqli->query($query) or error($mysqli->error);
    $endorsed = $mysqli->insert_id;
  } else {
    $row = $result->fetch_assoc();
    $endorsed = $row['id'];
  }
  $mysqli->query($query) or error($mysqli->error);
  if (isset($endorsement->revoke) && $endorsement->revoke) {
    # FIXME: handle self-revocation
    $query = "DELETE FROM link WHERE endorser=$endorser AND endorsed=$endorsed";
  } else
    $query = "INSERT IGNORE INTO link(endorser, endorsed) VALUES($endorser, $endorsed)";
  $mysqli->query($query) or error($mysqli->error);
}

# run page rank algorithm, see https://en.wikipedia.org/wiki/PageRank
$d = 0.85;  # d is the damping parameter (default value is 0.85)

# N is the new total number of entities
$query = "SELECT COUNT(*) AS N FROM entity";
$result = $mysqli->query($query) or error($mysqli->error);
$count = $result->fetch_assoc();
$N = intval($count['N']);
$threshold = 1.0 / $N;
$one_year = intval($now + 1 * 365.25 * 24 * 60 * 60 * 1000);

for($i = 0; $i < 13; $i++) {  # supposed to converge in about 13 iterations
  $query = "SELECT id FROM entity WHERE expires > 0";
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
    $query = "UPDATE entity SET endorsed=1, changed=1 WHERE id=$id AND endorsed=0 AND reputation>$threshold";
    $mysqli->query($query) or error($mysqli->error);
    $query = "UPDATE entity SET endorsed=0, changed=1 WHERE id=$id AND endorsed=1 AND reputation<$threshold";
    $mysqli->query($query) or error($mysqli->error);
  }
}

$count_e = 0;
$count_r = 0;
$table = '';
$schema = "https://directdemocracy.vote/json-schema/$version/endorsement.schema.json";
$private_key = openssl_get_privatekey("file://../id_rsa") or error("Failed to read private key file");
$query = "SELECT id, `key`, signature, endorsed, reputation, expires FROM entity WHERE changed=1";
$result = $mysqli->query($query) or error($mysqli->error);
while($entity = $result->fetch_assoc()) {
  $id = intval($entity['id']);
  $table .= "$id:\t" . floatval($entity['reputation']) ."\n";
  $endorsement = array('schema' => $schema,
                       'key' => $public_key,
                       'signature' => '',
                       'published' => $now,
                       'expires' => floatval($entity['expires']));
  if ($entity['endorsed'] == 0) {
    $count_r++;
    $endorsement['revoke'] = true;
  } else
    $count_e++;
  $endorsement['publication'] = array('key' => $entity['key'], 'signature' => $entity['signature']);
  $signature = '';
  $data = json_encode($endorsement, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  $success = openssl_sign($data, $signature, $private_key, OPENSSL_ALGO_SHA256);
  if ($success === FALSE)
    error("Failed to sign endorsement");
  $endorsement['signature'] = base64_encode($signature);
  # publish endorsement for citizen is allowed to vote by this trustee
  $data = json_encode($endorsement, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  $options = array('http' => array('method' => 'POST',
                                   'content' => $data,
                                   'header' => "Content-Type: application/json\r\n" .
                                               "Accept: application/json\r\n"));
  $response = file_get_contents("$publisher/publish.php", false, stream_context_create($options));
  $json = json_decode($response);
  if ($json == NULL)
    die($response);
  if (isset($json->error))
    error(json_encode($json->error));

  $query = "UPDATE entity SET changed=0";
  $mysqli->query($query) or error($mysqli->error);
}

die("endorsed $count_e and revoked $count_r citizens out of $N:\n$table");
?>
