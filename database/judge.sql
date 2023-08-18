CREATE TABLE `participant` (
  `id` int(11) NOT NULL,
  `key` varchar(512) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `signature` varchar(512) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `home` point NOT NULL,
  `reputation` float NOT NULL,
  `endorsed` tinyint(1) NOT NULL,
  `changed` tinyint(1) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

CREATE TABLE `link` (
  `endorser` int(11) NOT NULL,
  `endorsed` int(11) NOT NULL,
  `revoke` tinyint(1) NOT NULL,
  `distance` float NOT NULL,
  `date` bigint(15) NOT NULL,
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

CREATE TABLE `status` (
  `lastUpdate` bigint(15) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

ALTER TABLE `participant`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `key` (`key`);

ALTER TABLE `link`
  ADD PRIMARY KEY (`endorser`,`endorsed`);

ALTER TABLE `participant`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=97;
COMMIT;
