<?php
  function error($message) {
    die("{\"error\":\"$message\"}");
  }

  $worlds = array();
  foreach (new DirectoryIterator('../storage') as $file) {
    if($file->isDot()) continue;
    array_push($array, $file);
  }

  die(json_encode($array));
