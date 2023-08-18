<?php
require_once '../php/database.php';

$version = '0.0.2';
$notary = 'https://notary.directdemocracy.vote';

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

# remove broken links
$query = "DELETE FROM link WHERE NOT EXISTS (SELECT NULL FROM participant WHERE id=endorser OR id=endorsed)";
$mysqli->query($query) or error($mysqli->error);

# compute the initial reputation value from the number of entities
$query = "SELECT COUNT(*) AS N FROM participant";
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
$url = "$notary/publications.php?type=endorsement&published_from=$last_update";
$response = file_get_contents($url, false, stream_context_create($options));
$endorsements = json_decode($response);
if (isset($endorsements->error))
  error($endorsements->error);
$public_key_file = fopen("../id_rsa.pub", "r") or error("Failed to read public key file");
$k = fread($public_key_file, filesize("../id_rsa.pub"));
fclose($public_key_file);
$public_key = stripped_key($k);

# insert endorser and endorsed in entities, links
if ($endorsements)
  foreach($endorsements as $endorsement) {
    if ($endorsement->key == $public_key)  # ignore mine
      continue;
    $query = "SELECT id, ST_Y(home) AS latitude, ST_X(home) AS longitude FROM participant WHERE `key`='$endorsement->key'";  # endorser
    $result = $mysqli->query($query) or error($mysqli->error);
    if (!$result->num_rows) {
      $response = file_get_contents("$notary/publication.php?key=$endorsement->key", false, stream_context_create($options));
      $endorser = json_decode($response);
      if (isset($endorser->error))
        error("Trying to get $notary/publication.php?key=$endorsement->key, however $endorser->error");
      if (!isset($endorser->latitude))
        $endorser->latitude = 0;
      if (!isset($endorser->longitude))
        $endorser->longitude = 0;
      if ($endorser->key !== $endorsement->key)
        die("Key mismatch for endorser in notary database.");
      $query = "INSERT IGNORE INTO participant(`key`, signature, home, reputation, endorsed, changed) "
              ."VALUES('$endorser->key', '$endorser->signature', POINT($endorser->longitude, $endorser->latitude), 0, 0, 0) ";
      $mysqli->query($query) or error("$query $mysqli->error");
      $endorser->id = $mysqli->insert_id;
    } else
      $endorser = $result->fetch_object();
    $query = "SELECT id FROM participant WHERE signature='$endorsement->endorsedSignature'";
    $result = $mysqli->query($query) or error($mysqli->error);
    if (!$result->num_rows) {
      $fingerprint = sha1($endorsement->endorsedSignature);
      $response = file_get_content("$notary/publication.php?fingerprint=$fingerprint", false, stream_context_create($options));
      $endorsed = json_decode($response);
      if (isset($endorsed->error))
        error($endorsed->error);
      if (!isset($endorsed->latitude))
        $endorsed->latitude = 0;
      if (!isset($endorsed->longitude))
        $endorsed->longitude = 0;
      if ($endorsed->signature !== $endorsement->endorsedSignature)
        die("Key mismatch for endorsed in notary database.");
      $query = "INSERT IGNORE INTO participant(`key`, signature, home, reputation, endorsed, changed) "
              ."VALUES('$endorsed->key', '$endorsed->signature', POINT($endorsed->longitude, $endorsed->latitude), $initial, 0, 0) ";
      $mysqli->query($query) or error("$query $mysqli->error");
      $endorsed->id = $mysqli->insert_id;
    } else
      $endorsed->id = $result->fetch_object();
    if (($endorsed->latitude == 0 && $endorsed->longitude == 0) ||
        ($endorser->latitude == 0 && $endorser->longitude == 0))
      $distance = "-1";  # one of them is not a citizen (maybe a judge, a notary or a station)
    else
      $distance = "ST_Distance_Sphere(POINT($endorsed->latitude, $endorsed->longitude), POINT($endorser->latitude, $endorser->longitude))";
    $query = "INSERT INTO link(endorser, endorsed, distance, `revoke`, `date`) "
            ."VALUES($endorser->id, $endorsed->id, $distance, $endorsement->revoke, $endorsement->published) "
            ."ON DUPLICATE UPDATE `revoke` = $endorsement->revoke, `date` = $endorsement->published;";    
    $mysqli->query($query) or error($mysqli->error);
  }

# run page rank algorithm, see https://en.wikipedia.org/wiki/PageRank
$d = 0.85;  # d is the damping parameter (default value is 0.85)

# N is the new total number of entities
$query = "SELECT COUNT(*) AS N FROM participant";
$result = $mysqli->query($query) or error($mysqli->error);
$count = $result->fetch_assoc();
$N = intval($count['N']);
$threshold = 0.5 / $N;
$one_year = intval($now + 1 * 365.25 * 24 * 60 * 60 * 1000);

for($i = 0; $i < 13; $i++) {  # supposed to converge in about 13 iterations
  $query = "SELECT id FROM participant";
  $result = $mysqli->query($query) or error($mysqli->error);
  while($participant = $result->fetch_assoc()) {
    $id = intval($participant['id']);
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
      $query = "SELECT reputation FROM participant WHERE id=$endorser";
      $r1 = $mysqli->query($query) or error($mysqli->error);
      $e = $r1->fetch_assoc();
      $PRj = floatval($e['reputation']);
      $r1->free();
      $sum += $PRj / $Lj;
    }
    $r0->free();
    $PR = (1 - $d) / $N + $d * $sum;
    $query = "UPDATE participant SET reputation=$PR WHERE id=$id";
    $mysqli->query($query) or error($mysqli->error);
    $query = "UPDATE participant SET endorsed=1, changed=1 WHERE id=$id AND endorsed=0 AND reputation>$threshold";
    $mysqli->query($query) or error($mysqli->error);
    $query = "UPDATE participant SET endorsed=0, changed=1 WHERE id=$id AND endorsed=1 AND reputation<$threshold";
    $mysqli->query($query) or error($mysqli->error);
  }
}

$count_e = 0;
$count_r = 0;
$table = '';
$schema = "https://directdemocracy.vote/json-schema/$version/endorsement.schema.json";
$private_key = openssl_get_privatekey("file://../id_rsa") or error("Failed to read private key file");
$query = "SELECT id, `key`, signature, endorsed, reputation FROM participant WHERE changed=1";
$result = $mysqli->query($query) or error($mysqli->error);
while($participant = $result->fetch_assoc()) {
  $id = intval($participant['id']);
  $table .= "$id:\t" . floatval($participant['reputation']) ."\n";
  $endorsement = array('schema' => $schema,
                       'key' => $public_key,
                       'signature' => '',
                       'published' => $now);
  if ($participant['endorsed'] == 0) {
    $count_r++;
    $endorsement['revoke'] = true;
  } else
    $count_e++;
  $endorsement['publication'] = array('key' => $participant['key'], 'signature' => $participant['signature']);
  $signature = '';
  $data = json_encode($endorsement, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  $success = openssl_sign($data, $signature, $private_key, OPENSSL_ALGO_SHA256);
  if ($success === FALSE)
    error("Failed to sign endorsement");
  $endorsement['signature'] = base64_encode($signature);
  # publish endorsement for citizen is allowed to vote by this judge
  $data = json_encode($endorsement, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  $options = array('http' => array('method' => 'POST',
                                   'content' => $data,
                                   'header' => "Content-Type: application/json\r\n" .
                                               "Accept: application/json\r\n"));
  $response = file_get_contents("$notary/publish.php", false, stream_context_create($options));
  $json = json_decode($response);
  if ($json == NULL)
    die($response);
  if (isset($json->error))
    error(json_encode($json->error));

  $query = "UPDATE participant SET changed=0";
  $mysqli->query($query) or error($mysqli->error);
}

die("endorsed $count_e and revoked $count_r citizens out of $N:\n$table");
?>
