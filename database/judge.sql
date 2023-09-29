CREATE TABLE `participant` (
  `id` int(11) NOT NULL,
  `key` blob NOT NULL,
  `signature` blob NOT NULL,
  `home` point NOT NULL,
  `reputation` float NOT NULL,
  `endorsed` tinyint(1) NOT NULL,
  `changed` tinyint(1) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `link` (
  `endorser` int(11) NOT NULL,
  `endorsed` int(11) NOT NULL,
  `revoke` tinyint(1) NOT NULL,
  `distance` float NOT NULL,
  `date` datetime NOT NULL,
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `status` (
  `date` datetime NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `participant`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `key` (`key`);

ALTER TABLE `link`
  ADD PRIMARY KEY (`endorser`,`endorsed`);

ALTER TABLE `participant`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=97;
COMMIT;
