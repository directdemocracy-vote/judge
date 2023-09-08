# Calculing reputation of the citizens

## General algorithm
```
for 15 iterations // 15 is an arbitrary number. The goal is that the algorithm always converge.
  for each citizen
    sum = 0
    for each link that endorse this citizen
    sum += link reputation * distanceFactor * timeFactor

  reputation = reputationFunction(growthFactor + sum)
  if reputation > threshold // In our case the threshold is 0.5
    citizen is endorsed
}
```
## Detailed functions and terms
### distanceFactor
Goal: reduce the weight of endorsement links between two citizens in proportion to the distance between them.

Milestones taken into account when the functions were designed:
 - The distance should have little or no impact in the first few kilometers.
 - The link weight should be halved at 10 km.
 - The link weight should be 0 when two citizens are more than 100 km apart.

Function:
if distance < 10km:

```math
distanceFactor = 1 -  {1 \over 1 + e^{10 - x \over 2}}
```
else if distance < 100km:

```math
distanceFactor = {0.5 \over 0.9} (1 - 0.01x)
```

else
```math
distanceFactor = 0
```
![distance](https://github.com/directdemocracy-vote/judge/assets/25938827/312023dc-4bc0-4fb7-831c-227e3822023a)
*The red line is followed until 10km, and then we take the blue line into account.*

### timeFactor
Goal: reduce the weight of endorsement links between two citizens as it ages.

Milestones taken into account when the functions were designed:
 - The age should have little or no impact if the link is less than a year old.
 - The link weight should be halved after 2 years.
 - The link weight should be 0 after 3 years.

Function:
```math
timeFactor = 1 -  {1 \over 1 + e^{4(2 - x)}}
```

![time](https://github.com/directdemocracy-vote/judge/assets/25938827/6fdd6625-ffaa-4b73-96ec-8b9de1dbfeeb)

**Note:**Here, the time is expressed in years to simplify the reading. However, in the application the time is recorded in milliseconds.

### growthFactor
Goal: attribute a initial reputation to the nodes.

It should decrease when the global reputation increase because there is less need for an initial reputation and we want to favor links with other citizens.

The parameters of this function have been empirically defined.
Function:
```math
growthFactor = {2 \over 1 + \sqrt{totalReputation}}
```
Where totalReputation is the sum of the reputation of all citizens

### reputationFunction

Goal: attribute a reputation to citizen.

The reputation should be bound between [0,1].
A citizen shoud need at least three strong endorsements to be endorsed.

Function:
if x < 3
```math
reputation  = {x^2 \over 18}
```
else
```math
reputation = 1 - {0.75 \over x -1.5}
```
![reputation](https://github.com/directdemocracy-vote/judge/assets/25938827/7308ea10-e0a1-4958-ac19-faa38109160d)
*The red line is followed until 3, and then we take the blue line into account.*
