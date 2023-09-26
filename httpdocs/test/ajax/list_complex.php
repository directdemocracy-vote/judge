<?php
  function error($message) {
    die("{\"error\":\"$message\"}");
  }

  $worlds = array();
  foreach (new DirectoryIterator('../storage/complex/') as $file) {
    if($file->isDot()) continue;
    array_push($worlds, $file->getFilename());
  }

  die(json_encode($worlds));
?>
