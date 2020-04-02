<?php
if (!isset($_GET['referendum']))
  die("Missing referendum GET argument.");
if (!isset($_GET['citizen']))
  die("Missing citizen GET argument.");

// check the database to determine if the specified citizen can vote to the specified referendum
// the citizen location should match the referendum area.
// the citizen reputation should be high enough to be allowed to vote.

// die("no");
die("yes");
?>
