<?php
  function error($message) {
    die("{\"error\":\"$message\"}");
  }

  $worlds = array();
  foreach (new DirectoryIterator('../storage/') as $file) {
    if($file->isDot()) continue;
    array_push($worlds, $file);
  }

  die(json_encode($worlds));
