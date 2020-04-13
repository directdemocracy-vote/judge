<?php
$version = "0.0.1";
$station = 'https://station.directdemocracy.vote';
$names = '';
$query = '';
foreach($_GET as $get) {
  echo $get;
  $names .= $get . "\n";
  $query .= $get . "&";
}
$url = "https://nominatim.openstreetmap.org/search?". $query . "polygon_geojson=1&format=json";
$options = [ "http" => [ "method" => "GET", "header" => "User-agent: directdemocracy\r\n" ] ];
$context = stream_context_create($options);
$result = file_get_contents($url, false, $context);
$search = json_decode($result);

$public_key_file = fopen("../id_rsa.pub", "r") or die("{\"error\":\"unable to open public key file\"}");
$k = fread($public_key_file, filesize("../id_rsa.pub"));
fclose($public_key_file);
$key = stripped_key($k);

$schema = "https://directdemocracy.vote/json-schema/$version/area.schema.json";
$area = array('schema' => $schema, 'key' => $key, 'signature' => '', 'published' => $now,
              'expires' => $now + 365.25 * 24 * 60 * 60 * 1000,  # expires in one year
              'name' => $names, 'polygons' => null);
$place = $search[0];
$jeojson = $place['jeoson'];
$polygons = array();
if ($jeojson['type'] == 'Polygon') {
  array_push($polygon, array($jeojson['coordinates']));
} elseif ($jeojson['type'] == 'MultiPolygon') {
  array_push($polygon, $jeojson['coordinates']);
}

# sign area
$data = json_encode($area, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
$private_key = openssl_get_privatekey("file://../id_rsa");
if ($private_key == FALSE)
  error("Failed to read private key.");
$signature = '';
$success = openssl_sign($data, $signature, $private_key, OPENSSL_ALGO_SHA256);
if ($success === FALSE)
  error("Failed to sign area.");
$area->signature = base64_encode($signature);

# publish area

die(json_encode($area));
?>
