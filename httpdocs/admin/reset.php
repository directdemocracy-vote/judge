<?php

require '../../../php/database.php';
$mysqli->query("DELETE FROM link") or die($mysqli->error);
$mysqli->query("DELETE FROM participant") or die($mysqli->error);
$mysqli->query("UPDATE status SET lastUpdate=0, areaCount=1") or die($mysqli->error);
die("Reset successful");
?>
