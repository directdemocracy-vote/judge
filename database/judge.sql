SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE TABLE `link` (
  `endorser` int(11) NOT NULL,
  `endorsed` int(11) NOT NULL,
  `revoke` tinyint(1) NOT NULL,
  `date` datetime NOT NULL,
  `distance` float NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `participant` (
  `id` int(11) NOT NULL,
  `key` blob NOT NULL,
  `signature` blob NOT NULL,
  `home` point NOT NULL,
  `reputation` float NOT NULL,
  `trusted` tinyint(1) NOT NULL,
  `changed` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `status` (
  `lastUpdate` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


ALTER TABLE `link`
  ADD PRIMARY KEY (`endorser`,`endorsed`),
  ADD KEY `endorsed` (`endorsed`);

ALTER TABLE `participant`
  ADD PRIMARY KEY (`id`);


ALTER TABLE `participant`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;


ALTER TABLE `link`
  ADD CONSTRAINT `endorsed` FOREIGN KEY (`endorsed`) REFERENCES `participant` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `endorser` FOREIGN KEY (`endorser`) REFERENCES `participant` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
COMMIT;
