# Simulation of the adoption of DirectDemocraty on a population
Given a geographic area, the algorithm will randomly generate new citizens according to density of the population in the area.
When created, a citizen is attributed a number of endorsements that she will create during her life.
Everyday, the citizen has a small chance to endorse another citizen.
Once new citizens and endorsements are created for a day, the algorithm recompute the reputation of each citizen.
According to this new reputation, it will then endorse the ones that have a reputation greater than a given threshold and revoke the others.
The simulation run for a predetermined numbers of days.

## Input files
Two files can be given as input to the generator.


### Density file (mandatory)
A csv file.
It contains the information about the number of inhabitant per hectare.
This file is created by using the `/utils/extractor.py` script and the density of population by hectare for Switzerland, that you can download [here](https://www.bfs.admin.ch/bfs/en/home/services/geostat/swiss-federal-statistics-geodata/population-buildings-dwellings-persons/population-housholds-from-2010.assetdetail.27045772.html).
In the `/utils/extractor.py` you must then specify the limit of the rectangle that will be extracted.

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
In this specific village, residents will have a greater incentive to install the application and endorse people than in others locations of the map

#### Initial citizens
It represents the citizens that have already downloaded the application at the beginning of the simulation.
They have the following format:
```
{
  "citizens": [{"x": 154400, "y": 159972}]
}
```
The coordinates are in pixels.
