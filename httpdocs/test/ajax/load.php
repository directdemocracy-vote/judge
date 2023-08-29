<?php
  function error($message) {
    die("{\"error\":\"$message\"}");
  }

  header('Content-Type: application/json');
  $json = file_get_contents('php://input');
  $data = json_decode($json);
  $filename = isset($data->name) ? $data->name : "myWorld.json";
  die('../storage/'.$filename);
  // readfile('../storage/'.$filename);
