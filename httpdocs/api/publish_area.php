<?php
$version = "2";
$notary = 'https://notary.directdemocracy.vote';

require_once '../../php/database.php';

function error($message) {
  if ($message[0] != '{')
    $message = '"'.$message.'"';
  die("{\"error\":$message}");
}

function stripped_key($public_key) {
  $stripped = str_replace("-----BEGIN PUBLIC KEY-----", "", $public_key);
  $stripped = str_replace("-----END PUBLIC KEY-----", "", $stripped);
  $stripped = str_replace(array("\r", "\n", '='), '', $stripped);
  return substr($stripped, 44, -6);
}

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: content-type");

$names = [];

if (isset($_GET['lat']) && isset($_GET['lon'])) {
  $local = true;
  $lat = floatval($_GET['lat']);
  $lon = floatval($_GET['lon']);
  $query = "reverse?lat=$lat&lon=$lon&";
} else {
  $local = false;
  $query = 'search?';
  $message = '';
  foreach($_GET as $key => $value) {
    $names[] = "$key=$value";
    $query .= "$key=" . urlencode($value) . "&";
    $message .= "$value, ";
  }
  if ($message)
    $message = substr($message, 0, -2);
}

# check if the area is not already published with a validity of at least 1 year.
$public_key_file = fopen("../../id_rsa.pub", "r") or die("{\"error\":\"unable to open public key file\"}");
$k = fread($public_key_file, filesize("../../id_rsa.pub"));
fclose($public_key_file);
$key = stripped_key($k);

if ($local)
  $request = array("judge" => $key, "lat" => $lat, "lon" => $lon);
else
  $request = array("judge" => $key, "area" => implode("\n", $names));
$data = json_encode($request, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
$options = array('http' => array('method' => 'POST',
                                 'content' => $data,
                                 'header' => "Content-Type: application/json\r\n" .
                                             "Accept: application/json\r\n"));
$response = file_get_contents("$notary/api/area.php", false, stream_context_create($options));
$json = json_decode($response);
if (isset($json->error))
  error($json->error);
if (isset($json->id) && $json->id !== 0)
  die($response);

$url = "https://nominatim.openstreetmap.org/". $query . "zoom=12&polygon_geojson=1&format=json";
$options = [ 'http' => [ 'method' => 'GET', 'header' => "User-agent: directdemocracy\r\n" ] ];
$context = stream_context_create($options);
$result = file_get_contents($url, false, $context);
$search = json_decode($result);
if (!$names) {
  $address = &$search->address;
  if (isset($address->suburb))
    $names[] = "suburb=$address->suburb";
  if (isset($address->borough))
    $names[] = "borough=$address->borough";
  if (isset($address->village))
    $names[] = "village=$address->village";
  if (isset($address->town))
    $names[] = "town=$address->town";
  if (isset($address->city))
    $names[] = "city=$address->city";
  if (isset($address->county))
    $names[] = "county=$address->county";
  if (isset($address->district))
    $names[] = "district=$address->district";
  if (isset($address->province))
    $names[] = "province=$address->province";
  if (isset($address->state_district))
    $names[] = "state_district=$address->state_district";
  if (isset($address->state))
    $names[] = "state=$address->state";
  if (isset($address->country))
    $names[] = "country=$address->country";
}
$schema = "https://directdemocracy.vote/json-schema/$version/area.schema.json";
$area = array('schema' => $schema, 'key' => $key, 'signature' => '', 'published' => time(), 'id' => 0, 'name' => $names, 'polygons' => null, 'local' => $local);
if ($local)
  $place = &$search;
else {
  if (count($search) == 0)
    die("Area not found: $message");
  $place = $search[0]; // FIXME: &$search[0]
}
$geojson = $place->geojson;
if ($geojson->type == 'Polygon') {
  $polygons = array();
  array_push($polygons, $geojson->coordinates);
} elseif ($geojson->type == 'MultiPolygon')
  $polygons = &$geojson->coordinates;
else
  error("Unsupported geometry type: '$geojson->type'");
$area['polygons'] = &$polygons;
$mysqli->query("UPDATE status SET areaCount=LAST_INSERT_ID(areaCount+1)") or die($mysqli->error);
$area['id'] = intval($mysqli->insert_id);
# sign area
$data = json_encode($area, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
$private_key = openssl_get_privatekey("file://../../id_rsa");
if ($private_key == FALSE)
  error("Failed to read private key.");
$signature = '';
$success = openssl_sign($data, $signature, $private_key, OPENSSL_ALGO_SHA256);
if ($success === FALSE)
  error("Failed to sign area.");
$area['signature'] = substr(base64_encode($signature), 0, -2);

# publish area
$area_data = json_encode($area, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
$options = array('http' => array('method' => 'POST',
                                 'content' => $area_data,
                                 'header' => "Content-Type: application/json\r\n" .
                                             "Accept: application/json\r\n"));
$response = file_get_contents("$notary/api/publish.php", false, stream_context_create($options));
$json = json_decode($response);
if (json_last_error() !== JSON_ERROR_NONE)
  die($response);
if (isset($json->error))
  error($json->error);
die($area_data);
?>
