<?php
require_once '../../php/database.php';

$version = '2';
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

function distance_function($distance) {
  if ($distance < 1)
    $distance = 1;

  if ($distance != 1)
    die("test".$distance);

  if ($distance < 10)
    return 1 - (1 / (1 + exp((10 - $distance) / 2)));
  else if ($distance < 100)
    return (0.5 / 0.9) * (1 - 0.01 * $distance);
  else
    return 0;
}

function time_function($time) {
  return 1 - (1 / (1 + exp((63072000 - $time) / 8000000)));
}

function reputation_function($x) {
  if ($x < 4)
    return pow($x, 2) / 18;
  else
    return 1 - (0.75 / ($x - 15));
}

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: content-type");

$now = time();

$query = "SELECT UNIX_TIMESTAMP(lastUpdate) AS lastUpdate FROM status";
$result = $mysqli->query($query) or error($mysqli->error);
$status = $result->fetch_assoc();
$result->free();
$last_update = intval($status['lastUpdate']);

// $update_every = 10;
// if ($last_update + $update_every > $now)
//   die("Updated in the last $update_every seconds");

$query = "UPDATE status SET lastUpdate=FROM_UNIXTIME($now)";
$mysqli->query($query) or error($mysqli->error);

# remove broken links if any
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
$url = "$notary/api/publications.php?type=endorsement&published_from=$last_update";
$response = file_get_contents($url, false, stream_context_create($options));
$endorsements = json_decode($response);
if (isset($endorsements->error))
  error($endorsements->error);
$public_key_file = fopen("../../id_rsa.pub", "r") or error("Failed to read public key file");
$k = fread($public_key_file, filesize("../../id_rsa.pub"));
fclose($public_key_file);
$public_key = stripped_key($k);

# insert endorser and endorsed in entities, links
if ($endorsements)
  foreach($endorsements as $endorsement) {
    if ($endorsement->key == $public_key)  # ignore mine
      continue;
    $query = "SELECT id, ST_Y(home) AS latitude, ST_X(home) AS longitude FROM participant WHERE `key` = FROM_BASE64('$endorsement->key')";  # endorser
    $result = $mysqli->query($query) or error($mysqli->error);
    if (!$result->num_rows) {
      $key = urlencode($endorsement->key);
      $response = file_get_contents("$notary/api/publication.php?key=$key", false, stream_context_create($options));
      $endorser = json_decode($response);
      if (isset($endorser->error))
        error("Trying to get $notary/api/publication.php?key=$endorsement->key, however $endorser->error");
      if (!isset($endorser->latitude))
        $endorser->latitude = 0;
      if (!isset($endorser->longitude))
        $endorser->longitude = 0;
      if ($endorser->key !== $endorsement->key)
        die("Key mismatch for endorser in notary database.");
      $query = "INSERT IGNORE INTO participant(`key`, signature, home, reputation, endorsed, changed) "
              ."VALUES(FROM_BASE64('$endorser->key'), FROM_BASE64('$endorser->signature'), POINT($endorser->longitude, $endorser->latitude), 0, 0, 0) ";
      $mysqli->query($query) or error("$query $mysqli->error");
      $endorser->id = $mysqli->insert_id;
    } else
      $endorser = $result->fetch_object();
    $query = "SELECT id, ST_Y(home) AS latitude, ST_X(home) AS longitude FROM participant WHERE signature = FROM_BASE64('$endorsement->endorsedSignature')";
    $result = $mysqli->query($query) or error($mysqli->error);
    if (!$result->num_rows) {
      $fingerprint = sha1($endorsement->endorsedSignature);
      $response = file_get_contents("$notary/api/publication.php?fingerprint=$fingerprint", false, stream_context_create($options));
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
              ."VALUES(FROM_BASE64('$endorsed->key'), FROM_BASE64('$endorsed->signature'), POINT($endorsed->longitude, $endorsed->latitude), $initial, 0, 0) ";
      $mysqli->query($query) or error($mysqli->error);
      $endorsed->id = $mysqli->insert_id;
    } else
      $endorsed = $result->fetch_object();
    if (($endorsed->latitude == 0 && $endorsed->longitude == 0) ||
        ($endorser->latitude == 0 && $endorser->longitude == 0))
      $distance = "-1";  # one of them is not a citizen (maybe a judge, a notary or a station)
    else
      $distance = "ST_Distance_Sphere(POINT($endorsed->latitude, $endorsed->longitude), POINT($endorser->latitude, $endorser->longitude))";
    $revoke = $endorsement->revoke ? 1 : 0;
    $query = "INSERT INTO link(endorser, endorsed, distance, `revoke`, date) "
            ."VALUES($endorser->id, $endorsed->id, $distance, $revoke, FROM_UNIXTIME($endorsement->published)) "
            ."ON DUPLICATE KEY UPDATE `revoke` = $revoke, date = FROM_UNIXTIME($endorsement->published);";
    $mysqli->query($query) or error($mysqli->error);
  }

# run the reputation algorithm, see https://github.com/directdemocracy-vote/judge/blob/master/httpdocs/reputation_algorithm.md

# N is the new total number of entities
$query = "SELECT COUNT(*) AS N FROM participant";
$result = $mysqli->query($query) or error($mysqli->error);
$count = $result->fetch_assoc();
$N = intval($count['N']);
if ($N == 0)
  die('Empty database.');

$threshold = 0.5;
for($i = 0; $i < 15; $i++) {  # supposed to converge in about 13 iterations
  $query = "SELECT SUM(reputation) AS total_reputation FROM participant";
  $result = $mysqli->query($query) or error($mysqli->error);
  $count = $result->fetch_assoc();
  $total_reputation = floatval($count['total_reputation']);

  $query = "SELECT id FROM participant";
  $result = $mysqli->query($query) or error($mysqli->error);
  while($participant = $result->fetch_assoc()) {
    $id = intval($participant['id']);
    $query = "SELECT link.distance, UNIX_TIMESTAMP(link.date) AS date, participant.reputation "
            ."FROM link INNER JOIN participant ON participant.id = link.endorser WHERE link.endorsed=$id AND link.revoke=0";
    $r0 = $mysqli->query($query) or error($mysqli->error);
    $sum = 0;
    while($link = $r0->fetch_assoc()) {
      $reputation = floatval($link['reputation']);
      $age = floatval(($now - intval($link['date'])));  # seconds
      $distance = ($link['distance'] === '-1') ? 0 : floatval(floatval($link['distance']) / 1000);  # expressed in km
      die($link['distance']);
      $distance_factor = distance_function($distance);
      $time_factor = time_function($age);
      $sum += $reputation * $distance_factor;
    }
    $r0->free();
    $new_reputation = reputation_function(2 / (1 + sqrt($total_reputation / $N)) + $sum);
    $query = "UPDATE participant SET reputation=$new_reputation WHERE id=$id";
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
$private_key = openssl_get_privatekey("file://../../id_rsa") or error("Failed to read private key file");
$query = "SELECT id, "
        ."REPLACE(TO_BASE64(`key`), '\\n', '') AS `key`, "
        ."REPLACE(TO_BASE64(signature), '\\n', '') AS signature, "
        ."endorsed, reputation "
        ."FROM participant WHERE changed=1";
$result = $mysqli->query($query) or error($mysqli->error);
while($participant = $result->fetch_assoc()) {
  $id = intval($participant['id']);
  $table .= "$id:\t" . floatval($participant['reputation']) ."\n";
  $endorsement = array('schema' => $schema,
                       'key' => $public_key,
                       'signature' => '',
                       'published' => $now,
                       'endorsedSignature' => $participant['signature']);
  if ($participant['endorsed'] == 0) {
    $count_r++;
    $endorsement['revoke'] = true;
  } else
    $count_e++;
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
  $response = file_get_contents("$notary/api/publish.php", false, stream_context_create($options));
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
