<?php
$version = "2";
$notary = 'https://notary.directdemocracy.vote';

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

$names = array();
$query = '';
$message = '';
foreach($_GET as $key => $value) {
  $names[] = "$key=$value";
  $query .= "$key=" . urlencode($value) . "&";
  $message .= "$value, ";
}
if ($message)
  $message = substr($message, 0, -2);

# check if the area is not already published with a validity of at least 1 year.
$public_key_file = fopen("../../id_rsa.pub", "r") or die("{\"error\":\"unable to open public key file\"}");
$k = fread($public_key_file, filesize("../../id_rsa.pub"));
fclose($public_key_file);
$key = stripped_key($k);

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

$url = "https://nominatim.openstreetmap.org/search?". $query . "zoom=10&polygon_geojson=1&format=json";
$options = [ 'http' => [ 'method' => 'GET', 'header' => "User-agent: directdemocracy\r\n" ] ];
$context = stream_context_create($options);
$result = file_get_contents($url, false, $context);
$search = json_decode($result);

$schema = "https://directdemocracy.vote/json-schema/$version/area.schema.json";
$area = array('schema' => $schema, 'key' => $key, 'signature' => '', 'published' => time(), 'name' => $names, 'polygons' => null);
if (count($search) == 0)
  die("Area not found: $message");
$place = $search[0];
$geojson = $place->geojson;
if ($geojson->type == 'Polygon') {
  $polygons = array();
  array_push($polygons, $geojson->coordinates);
} elseif ($geojson->type == 'MultiPolygon') {
  $polygons = &$geojson->coordinates;
} else
  error("Unsupported geometry type: '$geojson->type'");
$area['polygons'] = &$polygons;
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
die("{\"signature\":\"$area[signature]\"}");
?>
