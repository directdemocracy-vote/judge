<?php
$version = "0.0.1";
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

$names = '';
$query = '';
$message = '';
foreach($_GET as $key => $value) {
  $names .= "$key=$value\n";
  $query .= "$key=$value&";
  $message .= "$value, ";
}
if ($message)
  $message = substr($message, 0, -2);

# check if the area is not already published with a validity of at least 1 year.
$public_key_file = fopen("../id_rsa.pub", "r") or die("{\"error\":\"unable to open public key file\"}");
$k = fread($public_key_file, filesize("../id_rsa.pub"));
fclose($public_key_file);
$key = stripped_key($k);

$request = array("trustee" => $key, "area" => $names);
$data = json_encode($request, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
$options = array('http' => array('method' => 'POST',
                                 'content' => $data,
                                 'header' => "Content-Type: application/json\r\n" .
                                             "Accept: application/json\r\n"));
$response = file_get_contents("$publisher/area.php", false, stream_context_create($options));
$json = json_decode($response);
if (isset($json->error))
  error($json->error);
$now = intval(microtime(true) * 1000);  # milliseconds
if (isset($json->expires)) {
  if ($json->expires > $now + 365.25 * 24 * 60 * 60 * 1000)
  die("{\"status\":\"Already published area: $message\"}");
}

die("json->expires = " . $json->expires. " > ". ($now + 365.25 * 24 * 60 * 60 * 1000));

$url = "https://nominatim.openstreetmap.org/search?". $query . "polygon_geojson=1&format=json";
$options = [ 'http' => [ 'method' => 'GET', 'header' => "User-agent: directdemocracy\r\n" ] ];
$context = stream_context_create($options);
$result = file_get_contents($url, false, $context);
$search = json_decode($result);

$schema = "https://directdemocracy.vote/json-schema/$version/area.schema.json";
$area = array('schema' => $schema, 'key' => $key, 'signature' => '', 'published' => $now,
              'expires' => $now + 2 * 365.25 * 24 * 60 * 60 * 1000,  # expires in 2 years
              'name' => $names, 'polygons' => null);
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
$private_key = openssl_get_privatekey("file://../id_rsa");
if ($private_key == FALSE)
  error("Failed to read private key.");
$signature = '';
$success = openssl_sign($data, $signature, $private_key, OPENSSL_ALGO_SHA256);
if ($success === FALSE)
  error("Failed to sign area.");
$area['signature'] = base64_encode($signature);

# publish area
$area_data = json_encode($area, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
$options = array('http' => array('method' => 'POST',
                                 'content' => $area_data,
                                 'header' => "Content-Type: application/json\r\n" .
                                             "Accept: application/json\r\n"));
$response = file_get_contents("$publisher/publish.php", false, stream_context_create($options));
$json = json_decode($response);
if (isset($json->error))
  error($json->error);

die("{\"status\":\"Published area: $message\"}");

?>
