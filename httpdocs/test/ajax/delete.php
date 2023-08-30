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
  die("The name ".$name);

  require '../../../php/database.php';
  if($password === $database_password) {
    $name = '../storage/'.$name;
      die(basename($name));
  }
