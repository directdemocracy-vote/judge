<?php
$translator_dictionary = null;

function translator_init($language) {
  global $translator_dictionary;
  $json = file_get_contents(__DIR__."../httpdocs/i18n/$language.json"); 
  $translator_dictionary = json_decode($json, true); 
}

function translator_translate($key) {
  global $translator_dictionary;
  return $translator_dictionary[$key];
}
?>
