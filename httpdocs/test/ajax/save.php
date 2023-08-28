<?php
  function error($message) {
    die("{\"error\":\"$message\"}");
  }

  header('Content-Type: application/json');
  $json = file_get_contents('php://input');
  $data = json_decode($json);

  $name = isset($data->name) ? $data->name : "worldfile";
  $file = fopen('../storage/'.$name.'.json','w');
  fwrite($file, $json);
  fclose($file);
?>
