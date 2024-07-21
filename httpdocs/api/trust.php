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

function haversine_great_circle_distance($latitudeFrom, $longitudeFrom, $latitudeTo, $longitudeTo, $earthRadius = 6371000) {
  // convert from degrees to radians
  $latFrom = deg2rad($latitudeFrom);
  $lonFrom = deg2rad($longitudeFrom);
  $latTo = deg2rad($latitudeTo);
  $lonTo = deg2rad($longitudeTo);
  $latDelta = $latTo - $latFrom;
  $lonDelta = $lonTo - $lonFrom;
  $angle = 2 * asin(sqrt(pow(sin($latDelta / 2), 2) + cos($latFrom) * cos($latTo) * pow(sin($lonDelta / 2), 2)));
  return $angle * $earthRadius;
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
$url = "$notary/api/publications.php?type=certificate&since=$last_update";
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
    $query = "SELECT id, locality FROM participant WHERE `key` = FROM_BASE64('$certificate->key==')";  # endorser
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
      if (!isset($endorser->locality))
        $endorser->locality = 0;
      if ($endorser->key !== $certificate->key)
        die("Key mismatch for endorser in notary database.");
      $query = "INSERT IGNORE INTO participant(`key`, `signature`, locality, reputation, trusted, changed) "
              ."VALUES(FROM_BASE64('$endorser->key=='), FROM_BASE64('$endorser->signature=='), $endorser->locality, 0, 0, 0) ";
      $mysqli->query($query) or die("$query $mysqli->error");
      $endorser->id = $mysqli->insert_id;
    } else
      $endorser = $result->fetch_object();
    $deleted = $certificate->type === 'report' && ($certificate->comment === 'updated' || $certificate->comment === 'transferred' || $certificate->comment === 'deleted');
    if ($deleted)
      $mysqli->query("UPDATE participant SET changed=trusted, trusted=-1 WHERE signature=FROM_BASE64('$certificate->publication==')") or die($mysqli->error);
    else {
      $query = "SELECT id, locality FROM participant WHERE signature=FROM_BASE64('$certificate->publication==')";
      $result = $mysqli->query($query) or die($mysqli->error);
      if (!$result->num_rows) {
        $signature = urlencode($certificate->publication);
        $response = file_get_contents("$notary/api/publication.php?signature=$signature", false, stream_context_create($options));
        $endorsed = @json_decode($response);
        if ($endorsed === null && json_last_error() !== JSON_ERROR_NONE)
          die($response);
        if (isset($endorsed->error))
          die("$endorsed->error from $notary/api/publication.php?signature=$signature");
        if (!isset($endorsed->locality))
          $endorsed->locality = 0;
        if ($endorsed->signature !== $certificate->publication)
          die("Key mismatch for endorsed in notary database.");
        $trusted = $deleted ? -1 : 0;
        $query = "INSERT IGNORE INTO participant(`key`, signature, locality, reputation, trusted, changed) "
                ."VALUES(FROM_BASE64('$endorsed->key=='), FROM_BASE64('$endorsed->signature=='), $endorsed->locality, 0, $trusted, 0) ";
        $mysqli->query($query) or die($mysqli->error);
        $endorsed->id = $mysqli->insert_id;
      } else
        $endorsed = $result->fetch_object();
      if (($endorsed->locality == 0) || ($endorser->locality == 0)) # one of them is not a citizen (maybe a judge, a notary or a station)
        $distance = -1;
      elseif ($endorsed->locality === $endorser->locality) # they live in the same locality
        $distance = 0;
      else {
        $query = "SELECT ST_Distance_Sphere(locality1.location, locality2.location)/1000 AS distance FROM locality AS locality1 INNER JOIN locality AS locality2 ON locality2.osm_id="
                .$endorser->locality . " WHERE locality1.osm_id=" . $endorsed->locality;
        $result = $mysqli->query($query) or die($mysqli->error);
        $d = $result->fetch_assoc();
        if (!$d) {
          $context  = stream_context_create(array('http' => array('header' => 'User-Agent: Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36')));
          $url = "$notary/api/locate.php?osm_ids=" . $endorsed->locality . "," . $endorser->locality;
          $json = @file_get_contents($url, false, $context);
          # echo "$url => $json<br>";
          $localities = json_decode($json);
          if (!empty($localities)) {
            $query = "INSERT IGNORE INTO locality(osm_id, location, name) "
              ."VALUES(".$localities[0].osm_id.", ST_PointFromText('POINT(".$localities[0].longitude." ".$localities[0].latitude.")'), \"$localities[0].name\")";
            $mysqli->query($query) or die($mysqli->error);
            $query = "INSERT IGNORE INTO locality(osm_id, location, name) "
              ."VALUES(".$localities[1].osm_id.", ST_PointFromText('POINT(".$localities[1].longitude." ".$localities[1].latitude.")'), \"$localities[1].name\")";
            $mysqli->query($query) or die($mysqli->error);
            $distance = haversine_great_circle_distance(localities[0]->lat, localities[0]->lon, localities[1]->lat, localities[1]->lon);
          } else
            $distance = 1000; // 1000 km is a large distance which won't reinforce the trust level in case of 403 failure
          echo "distance = $distance<br>";
        } else
          $distance = floatval($d['distance']);
        $result->free();
      }
      $revoke = ($certificate->type === 'report' && str_starts_with($certificate->comment, 'revoked+')) ? 1 : 0;
      $query = "INSERT INTO link(endorser, endorsed, distance, `revoke`, date) "
              ."VALUES($endorser->id, $endorsed->id, $distance, $revoke, FROM_UNIXTIME($certificate->published)) "
              ."ON DUPLICATE KEY UPDATE `revoke`=$revoke, date=FROM_UNIXTIME($certificate->published);";
      $mysqli->query($query) or die($mysqli->error);
    }
  }

# run the reputation algorithm, see https://github.com/directdemocracy-vote/judge/blob/master/httpdocs/reputation_algorithm.md

# N is the new total number of entities
$query = "SELECT COUNT(*) AS N FROM participant WHERE trusted!=-1";
$result = $mysqli->query($query) or die($mysqli->error);
$count = $result->fetch_assoc();
$N = intval($count['N']);
if ($N == 0)
  die('Empty database.');

$threshold = 0.5;
for($i = 0; $i < 15; $i++) {  # supposed to converge in about 13 iterations
  $query = "SELECT SUM(reputation) AS total_reputation FROM participant WHERE trusted!=-1";
  $result = $mysqli->query($query) or die($mysqli->error);
  $count = $result->fetch_assoc();
  $total_reputation = floatval($count['total_reputation']);

  $query = "SELECT id FROM participant WHERE trusted!=-1";
  $result = $mysqli->query($query) or die($mysqli->error);
  while($participant = $result->fetch_assoc()) {
    $id = intval($participant['id']);
    $query = "SELECT link.distance, UNIX_TIMESTAMP(link.date) AS date, participant.reputation "
            ."FROM link INNER JOIN participant ON participant.id = link.endorser AND participant.trusted!=-1 WHERE link.endorsed=$id AND link.`revoke`=0";
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
    $query = "UPDATE participant SET trusted=1, changed=1 WHERE id=$id AND trusted=0 AND reputation>$threshold";
    $mysqli->query($query) or die($mysqli->error);
    $query = "UPDATE participant SET trusted=0, changed=1 WHERE id=$id AND trusted=1 AND reputation<$threshold";
    $mysqli->query($query) or die($mysqli->error);
  }
}

$count_trust = 0;
$count_distrust = 0;
$table = '';
$schema = "https://directdemocracy.vote/json-schema/$version/certificate.schema.json";
$private_key = openssl_get_privatekey("file://../../id_rsa") or die("Failed to read private key file");
$query = "SELECT id, "
        ."REPLACE(REPLACE(TO_BASE64(`key`), '\\n', ''), '=', '') AS `key`, "
        ."REPLACE(REPLACE(TO_BASE64(signature), '\\n', ''), '=', '') AS signature, "
        ."trusted, reputation "
        ."FROM participant WHERE changed=1";
$result = $mysqli->query($query) or die($mysqli->error);
while($participant = $result->fetch_assoc()) {
  $now = time();
  $id = intval($participant['id']);
  $table .= "$id:\t" . floatval($participant['reputation']) ."\n";
  $trusted = intval($participant['trusted']);
  $certificate = array('schema' => $schema,
                       'key' => $public_key,
                       'signature' => '',
                       'published' => $now,
                       'type' => '',
                       'publication' => $participant['signature']);
  if ($trusted <= 0) {
    $count_distrust++;
    $certificate['type'] = 'distrust';
  } else {
    $count_trust++;
    $certificate['type'] = 'trust';
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

  $query = "UPDATE participant SET changed=0, issued=FROM_UNIXTIME($now)";
  $mysqli->query($query) or die($mysqli->error);
}

die("trusted $count_trust and untrusted $count_distrust citizens out of $N:\n$table");
?>
