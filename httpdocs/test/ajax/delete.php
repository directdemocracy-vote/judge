<?php
  function error($message) {
    die("{\"error\":\"$message\"}");
  }

  header('Content-Type: application/json');
  $json = file_get_contents('php://input');
  $data = json_decode($json);
  if (!isset($data->name) || !isset($data->password))
    die("Missing parameter");

  $name = $data->name;
  $password = $data->password;

  require '../../../php/database.php';
  if($password === $database_password) {
    $name = '../storage/'.$name;
      if (basename(dirname($name)) === 'storage');
        unlink($name);
  }
