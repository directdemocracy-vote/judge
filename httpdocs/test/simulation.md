# Simulation of the adoption of DirectDemocraty in a population
Given a geographic area, the algorithm will randomly generate new citizens according to the density of population in the area.
When created, a citizen is attributed a number of endorsements that she will create during her life.
Everyday, the citizen has a small chance to endorse another citizen.
Once new citizens and endorsements are created for a day, the algorithm recompute the reputation of each citizen.
According to this new reputation, it will then endorse the ones that have a reputation greater than a given threshold and revoke the others.
The simulation run for a predetermined numbers of days.

## Data structures

### Tile
A tile represents an hectare following the grid present on [map.geo.admin.ch](https://map.geo.admin.ch/).

Some important characteristics:
  - `density`: the number of people that live in the hectare.
  - `firstNumber`: each citizen has a number from `0` to `size of population`.
    `firstNumber` is the smallest number attributed to a person living in this hectare.
    The citizen does not necessarily exist yet.
    This number is used to find the range of numbers of citizens that will live in this hectare.
  - `citizens`: the list of citizens living in this hectare.
  - `boost`: if the probability of new links/citizens should be boosted in this tile.
  - `threeKmList` / `tenKmList`: list of the hectares in the corresponding radius.
    In fact, to simplify the computation, it is defined as square and not a circle.

### Citizen
A citizen represents a person who has downloaded the application.

When a new citizen is created, it has several characteristics, some of them are:
  - `coordinates`: to know where to place it on the map.
  - `downloadDate`: to know when it has downloaded the application.
  - `linksToGet`: an array representing the number of links a node aims to have.
  - `number`: allows to find the hectare in which the citizen is.
  In this simulation, we assume that each citizen knows some people they would be willing to endorse.
  We defined three different areas: the hectare in which the citizen is located, a square of 36km² around the citizen, a square of 100km² around the citizen.
  For each of this areas, the citizen will want to create a number of links.
  The numbers are determined as follow:
    - hectare: random integer between 0 and 8, following a normal distribution centered at 4.
    - 36km²: random integer between 0 and 4, following a normal distribution centered at 2.
    - 100km²: random integer between 0 and 2, following a normal distribution centered at 1.

  The numbers are decreasing the further we get for two reasons:
    - The first area represents the members of the same house, or some close neighbors.
      Whereas the further areas represent some close friends or some close relative.
    - As the weight of each link partially depends on the distance between the two citizens' homes, it is more interesting to focus on finding people close to our home.

### Arrow
An arrow represents an endorsement from one citizen to another one.
The arrow can be double-headed if the endorsement is reciprocal.

Some important fields:
  - `distance`: the distance between the two citizens, useful to compute the weight of the endorsement.
  - `arrowHead1`/`arrowHead2`: contain the information regarding the endorsements.
    - `age`: when the endorsements was created.
    - `source`/`destination`: the direction of the endorsement.

## Input files
Two files can be given as input to the generator.

### Density file (mandatory)
A csv file.
It contains the number of inhabitants per hectare.
This file is created by using the `/utils/extractor.py` script and the density of population by hectare for Switzerland, that you can download [here](https://www.bfs.admin.ch/bfs/en/home/services/geostat/swiss-federal-statistics-geodata/population-buildings-dwellings-persons/population-housholds-from-2010.assetdetail.27045772.html).
In the `/utils/extractor.py` you must then specify the boundaries of the rectangle that will be extracted.

### municipality file (optionnal)
A json file.
It contains the information about the hectares that we want to "boost" and about citizens we want to manually create.

#### Boosting hectares
The hectares, you want to boost are stored as an array in the `tile_to_boost` field of the json.
They have the following format:
```
{
  "tile_to_boost": [{"x": 2528700, "y": 1159000},
    {"x": 2528800, "y": 1159000},
    {"x": 2530000, "y": 1159100},
    {"x": 2529900, "y": 1159500},
    {"x": 2530000, "y": 1159500},
    {"x": 2530100, "y": 1160700},
  ],
}
```

The `x` and `y` coordinates correspond to the coordinates displayed on this [map](https://map.geo.admin.ch/?lang=en&topic=ech&bgLayer=ch.swisstopo.pixelkarte-farbe&layers=ch.bfs.volkszaehlung-bevoelkerungsstatistik_einwohner&layers_timestamp=2021&E=2681750.00&N=1099000.00&zoom=1&catalogNodes=687,688)

Those hectares will have a higher probability of having new citizens and those citizens will have more change to create new endorsements.

They can represent the hectares that make up a village where a referendum is being held.
In this specific village, residents will have a greater incentive to install the application and endorse people than in others locations of the map.

#### Initial citizens
It represents the citizens that have already downloaded the application at the beginning of the simulation.
They have the following format:
```
{
  "citizens": [{"number": 5324}]
}
```
The number correspond to a citizen in a tile.

## Variables
Several variables are available to configure the simulation:
- `threshold`: the value that the probability computed in [shouldCreateANewLink](https://github.com/directdemocracy-vote/judge/blob/master/httpdocs/test/simulation.md#shouldcreateanewlinkdays-boost) must exceed to create a new endorsement. The value should be between 0 and 1.
- `thresholdBoosted`: same as above except that this variable is used instead of `threshold` when a `citizen` is on a boosted hectare. The value should be between 0 and 1.
- `daysToSimulate`: the number of days that the simulation will run when `Play` is pressed. The value should be a positive integer.
- `reciprocity`: percentage chance of reciprocal endorsement. The value should be between 0 and 1.
- `refuseToDownload`: probability that a person refuse to download the application when another one try to create an endorsement with her. The value should be between 0 and 1.
- `refuseToDownloadBoosted`: same as above but is applied instead on boosted hectares. The value should be a positive integer.
- `redrawBoosted`: used when creating new citizens that spontaneously discover the application to increase the chances of a new citizen to be created on a boosted hectare. The value should be between 0 and 1.
- `noSpontaneousCitizen`: the probability that, for a given day, nobody spontaneously discover the application (independetly of everything else). The value should be between 0 and 1.

Those variables are those that can be modified through the GUI. 
However, some other probabilities are too complex to be reduced to a single coefficient and you will need to modify the formula directly in the code.

## Initialization
It first loads the input files.
Then it uses them to creates:
  - `densityTiles`: list of all the hectares with a population of the world.
    Note that the hectare without inhabitant are not represented.
    For each tile, it needs to adapt the coordinates to fit the coordinates system of the canvas.
    If a json file is present, it defines which tile should benefit from boosted probabilities.
  - `totalPopulation`: obtained by summing the density of all tiles.
  - `availableCitizenNumbers`: the numbers that are available to be affected to new citizens.
    Those numbers will determine in which hectare the citizen will placed.

Finally, if a json file is present, initial citizens are spawned according to the information of the file.

## Simulation of one day
During the simulation of one day, it performs three main steps:
  - Look if existing citizens create new links.
  - Add new citizens that spontaneously download the application.
  - Recompute the reputation and increase the time.

### Create new links
#### In the main loop
Iterate through the list of citizens who have yet to create links.
For each area of this citizen, check if it should create a new link.
```
for citizen of citizenWithFreeLinks:
  if citizen.linksToGet[0] + citizen.linksToGet[1] + citizen.linksToGet[2] <= 0:
    citizenWithFreeLinks.delete(citizen)
  else:
    elapsedDays = today - citizen.downloadDate
    tile = getTile(citizen.number)
    boost = tile.boost

    totalCreated = 0
    for citizen.linksToGet[0]:
      if shouldCreateANewLink(elapsedDays, boost):
        if createLink(citizen, tile, 0):
          totalCreated++

    citizen.linksToGet[0] -= totalCreated

    totalCreated = 0
    for citizen.linksToGet[1]:
      if shouldCreateANewLink(elapsedDays, boost):
        neighbourTile = densityTiles[tile.threeKmList[getRandomInt(tile.threeKmList.length - 1)]]
        if neighbourTile is undefined': // means that there is no populated tile around
          totalCreated++
          continue

        if createLink(citizen, neighbourTile, 1):
          totalCreated++

    citizen.linksToGet[1] -= totalCreated

    totalCreated = 0
    for citizen.linksToGet[2]:
      if shouldCreateANewLink(elapsedDays):
        neighbourTile = densityTiles[tile.tenKmList[getRandomInt(tile.tenKmList.length - 1)]]
        if neighbourTile is undefined': // means that there is no populated tile around
          totalCreated++
          continue

        if createLink(citizen, neighbourTile, 2)
          totalCreated++

    citizen.linksToGet[2] -= totalCreated
```

#### getTile(number)
Retrieve a tile according to a citizen's number.
```
  for tile of densityTiles:
    if tile.hasNumber(number):
      return tile
```

Where `hasNumber` simply compute if the number is in [`tile.firstNumber`, `tile.firstNumber + tile.density`]

#### shouldCreateANewLink(days, boost)
Compute if a new link should be created or not depending on the number of days elpased since the citizen has downloaded the app and if the tile where he lived is boosted or not.
Note that we do not furnish the boost parameter for the 10km area.
This is a deliberate choice, because the boost represent a *local* incentive for people to download the app and create links, for example in the context of a local referendum.

```
p = Math.random() * (1 - ({(1 - threshold) / (1 + Math.exp((10 - days) / 4))))
return if boost not undefined then p > thresholdBoosted else p > threshold
```
Where the `thresholdBoosted`, `threshold` and the different coefficients can be modified to increase/decrease the frequency at which new links are created.

#### createLink(citizen, tile, area)
Create a link from the citizen given in parameter to a citizen in the designated tile.

```
target = citizenToCreateArrow(citizen, tile, area)
if (target is undefined) // no canditate was found in the area
  return
arrow = new Arrow(uniqueId++, citizen.id, target.id)

random = Math.random()
if (random < reciprocity) {
  arrow.arrowHead2 = new ArrowHead(uniqueId++, target.id, citizen.id, todayDate, arrow)
  target.linksToGet[area]--
}

return true
```

Note that there is `reciprocity` chance (by default 90%) that, when creating an endorsement, we create the reciprocal.
Because in most cases, when you will endorse someone, you will ask her to endorse you as well.

#### citizenToCreateArrow(citizen, tile, area, counter)
Return a citizen that fulfill the following conditions:
  - is not the same as the citizen passed in the parameter.
  - has not already a link with the citizen.
  - can still create a link in the designated area.

It begins by picking a random number allocated to the tile.
It checks if a citizen with this number already exist.
If it is the case and its fulfill the conditions, then returns it.
If the citizen does not exist, we do a probability check before creating it.
It represents the chance that the citizen refuse to download the app.
The check is easier if it is in an boosted tile.
If the process fails at any point, try to find another citizen in the same tile.
It tries at most 10 times to avoid infinite recursion.

```
if typeof counter is undefined':
  counter = 0
else if counter === 10 || tile.density === 1: // Prevent infinite recursion
  return

targetNumber = getRandomInt(tile.density - 1) + tile.firstNumber
if targetNumber === citizen.number:
  return citizenToCreateArrow(citizen, tile, area, ++counter)

let target
for tileCitizen of tile.citizens:
  if tileCitizen.number === targetNumber:
    target = tileCitizen
    break

if target is undefined:
  rand = Math.random()
  if tile.boost && rand < 0.2:
    return
  else if rand < 0.7:
    return
  target = createTarget(targetNumber) // Actually create the citizen and add it to the world
}

if (target.linksToGet[area] <= 0 || citizen.endorsedBy.has(target.id) || citizen.endorse.has(target.id))
  return citizenToCreateArrow(citizen, tile, area, ++counter)

return target
```
### Create new citizens
During this part, new citizens are spawns.
They represents people that have heard of the application through the media or by themself.

### In the main loop
First, there is probability check that can totally cancel this phase.
It is done to represent the fact that they will be days where no media talked about the application and nobody found about it.
Then, the number of new citizens is computed.
The number is random but depends on the number of citizens that already exist and on the number of people that does not have the application yet.
It depends on the number of citizens that already exist to represent the fact that the more people download the application, the more the media are going to talk about it.
It depends on the number of people that does not have the application yet to represent the fact the when the vast majority of the population will have the application, the remaining part will be harder to convince through the media because they have already been exposed to it and have made the choice to not download the application.
Then, we create the right number of new citizens.

```
if World.instance.rng() > getRandomInt(noSpontaneousCitizen):
  numberOfNewCitizens = getRandomInt(floor(sqrt((citizens.size + 1) *
      (1 - (citizens.size / totalPopulation)))))

  if (citizens.size + numberOfNewCitizens > totalPopulation): // to avoid creating more citizens than possible
    numberOfNewCitizens = totalPopulation - size
    citizensAllSpawned = true

  for numberOfNewCitizens:
    citizenNumber = getValidNewCitizenNumber()
    spawnCitizen(citizenNumber)
```

#### getValidNewCitizenNumber()
Draw a random citizen number from the list of available numbers.
The number will indicate in which hectare the new citizen will be spawned.
If there is some boosted tiles (defined in jsonUrl) and the number drawn is not in a boosted tile, try again.
The maximum number of trials is defined by the `redrawBoosted` variable.

```
index
counter = if jsonUrl is undefined then 2 else 0
do:
  index = getRandomInt(availableCitizenNumbers.length - 1)
  counter++
  if getTile(index).boost:
    break
while counter < redrawBoosted

return availableCitizenNumbers.splice(index, 1)[0]
```

### Recompute the reputation and increase the time.
#### Recompute the reputation
At the end of each day, the reputation is recomputed according to the function described in the [reputation_algorithm](reputation_algorithm.md) file.
The reputation function is quite fast: we measured that it took around 350 milliseconds to perform the 15 iterations of computing the reputation of a world with 30'000 citizens and 200'000 links.
So in the reality, the reputation will be computed more often, nearly every time there is a change in the network.

#### Increase the time
In our example, we increase the time by 86400000 milliseconds, which correspond to one day.
It is possible to change this value to represent a shorter, or longer, time step.
However, it may be necessary to adjust the constants used in the calculation of the different probabilities.

### Events not simulated
Some categories of events are not simulated right now:
  - Revocation of a citizen: can happen if someone moves, or if he uninstalls the application.
  - Revocation of an endorsement: can happened if one end of the link is revoked, but someone can also manually revoke a link for a personal reason.
  - Renewal of an endorsements: the time since a endorsements has been created play a role in the weight of the endorsement. After one year, the weight will begin to decrease to reach zero around three years. So citizens are expected to renew their endorsements every one or two years.

Even so those events are not simulated, it would be possible to add them.
