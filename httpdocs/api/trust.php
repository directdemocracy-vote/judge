<?php
require_once '../../php/database.php';

$version = '2';
$notary = 'https://notary.directdemocracy.vote';

function stripped_key($public_key) {
  $stripped = str_replace("-----BEGIN PUBLIC KEY-----", "", $public_key);
  $stripped = str_replace("-----END PUBLIC KEY-----", "", $stripped);
  $stripped = str_replace(array("\r", "\n", '='), '', $stripped);
  return substr($stripped, 44, -6);
}

function distance_function($distance) {
  if ($distance < 1)
    $distance = 1;

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
  if ($x < 3)
    return pow($x, 2) / 18;
  else
    return 1 - (0.75 / ($x - 1.5));
}

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: content-type");

$now = time();

if (isset($_GET['reset'])) {
  $mysqli->query("UPDATE `status` SET lastUpdate=DATE('2000-01-01 00:00:00')") or die($mysqli->error);
  die('reset');
}

$query = "SELECT UNIX_TIMESTAMP(lastUpdate) AS lastUpdate FROM `status`";
$result = $mysqli->query($query) or die($mysqli->error);
$status = $result->fetch_assoc();
$result->free();
$last_update = intval($status['lastUpdate']);

if (isset($_GET['force']))
  $last_update = 0;

$update_every = 10;
if ($last_update + $update_every > $now)
  die("Updated in the last $update_every seconds");

$query = "UPDATE status SET lastUpdate=FROM_UNIXTIME($now)";
$mysqli->query($query) or die($mysqli->error);

# remove broken links if any
$query = "DELETE FROM link WHERE NOT EXISTS (SELECT NULL FROM participant WHERE id=endorser OR id=endorsed)";
$mysqli->query($query) or die($mysqli->error);

$options = array('http' => array('method' => 'GET',
                                 'header' => "Content-Type: application/json\r\nAccept: application/json\r\n"));
$url = "$notary/api/publications.php?type=certificate&certificate_type=endorse+report&since=$last_update";
$response = file_get_contents($url, false, stream_context_create($options));
$certificates = @json_decode($response);
if ($certificates === null && json_last_error() !== JSON_ERROR_NONE)
  die($response);
if (isset($certificates->error))
  die($certificates->error);
$public_key_file = fopen("../../id_rsa.pub", "r") or die("Failed to read public key file");
$k = fread($public_key_file, filesize("../../id_rsa.pub"));
fclose($public_key_file);
$public_key = stripped_key($k);

# insert endorser and endorsed in participant, link
if ($certificates)
  foreach($certificates as $certificate) {
    $query = "SELECT id, ST_Y(home) AS latitude, ST_X(home) AS longitude FROM participant WHERE `key` = FROM_BASE64('$certificate->key==')";  # endorser
    $result = $mysqli->query($query) or die($mysqli->error);
    if (!$result->num_rows) {
      $key = urlencode($certificate->key);
      $response = file_get_contents("$notary/api/publication.php?key=$key", false, stream_context_create($options));
      $endorser = @json_decode($response);
      # TODO: verify signatures of publication
      if ($endorser === null && json_last_error() !== JSON_ERROR_NONE)
        die($response);
      if (isset($endorser->error))
        die("$endorser->error from $notary/api/publication.php?key=$key");
      if (!isset($endorser->latitude))
        $endorser->latitude = 0;
      if (!isset($endorser->longitude))
        $endorser->longitude = 0;
      if ($endorser->key !== $certificate->key)
        die("Key mismatch for endorser in notary database.");
      $query = "INSERT IGNORE INTO participant(`key`, `signature`, home, reputation, trusted, changed) "
              ."VALUES(FROM_BASE64('$endorser->key=='), FROM_BASE64('$endorser->signature=='), POINT($endorser->longitude, $endorser->latitude), 0, 0, 0) ";
      $mysqli->query($query) or die("$query $mysqli->error");
      $endorser->id = $mysqli->insert_id;
    } else
      $endorser = $result->fetch_object();
    $query = "SELECT id, ST_Y(home) AS latitude, ST_X(home) AS longitude FROM participant WHERE signature=FROM_BASE64('$certificate->publication==')";
    $result = $mysqli->query($query) or die($mysqli->error);
    if (!$result->num_rows) {
      $signature = urlencode($certificate->publication);
      $response = file_get_contents("$notary/api/publication.php?signature=$signature", false, stream_context_create($options));
      $endorsed = @json_decode($response);
      if ($endorsed === null && json_last_error() !== JSON_ERROR_NONE)
        die($response);
      if (isset($endorsed->error))
        die("$endorsed->error from $notary/api/publication.php?signature=$signature");
      if (!isset($endorsed->latitude))
        $endorsed->latitude = 0;
      if (!isset($endorsed->longitude))
        $endorsed->longitude = 0;
      if ($endorsed->signature !== $certificate->publication)
        die("Key mismatch for endorsed in notary database.");
      $query = "INSERT IGNORE INTO participant(`key`, signature, home, reputation, trusted, changed) "
              ."VALUES(FROM_BASE64('$endorsed->key=='), FROM_BASE64('$endorsed->signature=='), POINT($endorsed->longitude, $endorsed->latitude), 0, 0, 0) ";
      $mysqli->query($query) or die($mysqli->error);
      $endorsed->id = $mysqli->insert_id;
    } else
      $endorsed = $result->fetch_object();
    if (($endorsed->latitude == 0 && $endorsed->longitude == 0) ||
        ($endorser->latitude == 0 && $endorser->longitude == 0))
      $distance = "-1";  # one of them is not a citizen (maybe a judge, a notary or a station)
    else
      $distance = "ST_Distance_Sphere(POINT($endorsed->longitude, $endorsed->latitude), POINT($endorser->longitude, $endorser->latitude))";
    $report = $certificate->report ? 1 : 0;
    $query = "INSERT INTO link(endorser, endorsed, distance, report, date) "
            ."VALUES($endorser->id, $endorsed->id, $distance, $report, FROM_UNIXTIME($certificate->published)) "
            ."ON DUPLICATE KEY UPDATE report = $report, date = FROM_UNIXTIME($certificate->published);";
    $mysqli->query($query) or die($mysqli->error);
  }

# run the reputation algorithm, see https://github.com/directdemocracy-vote/judge/blob/master/httpdocs/reputation_algorithm.md

# N is the new total number of entities
$query = "SELECT COUNT(*) AS N FROM participant";
$result = $mysqli->query($query) or die($mysqli->error);
$count = $result->fetch_assoc();
$N = intval($count['N']);
if ($N == 0)
  die('Empty database.');

$threshold = 0.5;
for($i = 0; $i < 15; $i++) {  # supposed to converge in about 13 iterations
  $query = "SELECT SUM(reputation) AS total_reputation FROM participant";
  $result = $mysqli->query($query) or die($mysqli->error);
  $count = $result->fetch_assoc();
  $total_reputation = floatval($count['total_reputation']);

  $query = "SELECT id FROM participant";
  $result = $mysqli->query($query) or die($mysqli->error);
  while($participant = $result->fetch_assoc()) {
    $id = intval($participant['id']);
    $query = "SELECT link.distance, UNIX_TIMESTAMP(link.date) AS date, participant.reputation "
            ."FROM link INNER JOIN participant ON participant.id = link.endorser WHERE link.endorsed=$id AND link.report=0";
    $r0 = $mysqli->query($query) or die($mysqli->error);
    $sum = 0;
    while($link = $r0->fetch_assoc()) {
      $reputation = floatval($link['reputation']);
      $age = floatval(($now - intval($link['date'])));  # seconds
      $distance = ($link['distance'] === '-1') ? 0 : floatval(floatval($link['distance']) / 1000);  # expressed in km
      $distance_factor = distance_function($distance);
      $time_factor = time_function($age);
      $sum += $reputation * $distance_factor * $time_factor;
    }
    $r0->free();
    $new_reputation = reputation_function(2 / (1 + sqrt($total_reputation / $N)) + $sum);
    $query = "UPDATE participant SET reputation=$new_reputation WHERE id=$id";
    $mysqli->query($query) or die($mysqli->error);
    $query = "UPDATE participant SET endorsed=1, changed=1 WHERE id=$id AND endorsed=0 AND reputation>$threshold";
    $mysqli->query($query) or die($mysqli->error);
    $query = "UPDATE participant SET endorsed=0, changed=1 WHERE id=$id AND endorsed=1 AND reputation<$threshold";
    $mysqli->query($query) or die($mysqli->error);
  }
}

$count_t = 0;
$count_u = 0;
$table = '';
$schema = "https://directdemocracy.vote/json-schema/$version/endorsement.schema.json";
$private_key = openssl_get_privatekey("file://../../id_rsa") or die("Failed to read private key file");
$query = "SELECT id, "
        ."REPLACE(REPLACE(TO_BASE64(`key`), '\\n', ''), '=', '') AS `key`, "
        ."REPLACE(REPLACE(TO_BASE64(signature), '\\n', ''), '=', '') AS signature, "
        ."trusted, reputation "
        ."FROM participant WHERE changed=1";
$result = $mysqli->query($query) or die($mysqli->error);
while($participant = $result->fetch_assoc()) {
  $id = intval($participant['id']);
  $table .= "$id:\t" . floatval($participant['reputation']) ."\n";
  $certificate = array('schema' => $schema,
                       'key' => $public_key,
                       'signature' => '',
                       'published' => $now,
                       'type' => '',
                       'publication' => $participant['signature']);
  if ($participant['trusted'] == 0) {
    $count_t++;
    $certificate['type'] = 'untrusted';
  } else {
    $count_u++;
    $certificate['type'] = 'trusted';
  }
  $signature = '';
  $data = json_encode($certificate, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  $success = openssl_sign($data, $signature, $private_key, OPENSSL_ALGO_SHA256);
  if ($success === FALSE)
    die("Failed to sign endorsement");
  $certificate['signature'] = substr(base64_encode($signature), 0, -2);
  # publish endorsement for citizen is allowed to vote by this judge
  $data = json_encode($certificate, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  $options = array('http' => array('method' => 'POST',
                                   'content' => $data,
                                   'header' => "Content-Type: application/json\r\n" .
                                               "Accept: application/json\r\n"));
  $response = file_get_contents("$notary/api/publish.php", false, stream_context_create($options));
  $json = @json_decode($response);
  if ($json === null && json_last_error() !== JSON_ERROR_NONE)
    die($response);
  if (isset($json->error))
    die($json->error);

  $query = "UPDATE participant SET changed=0";
  $mysqli->query($query) or die($mysqli->error);
}

die("trusted $count_t and untrusted $count_u citizens out of $N:\n$table");
?>
