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
distanceFactor = 1 -  {1 \over 1 + e^{10 - x \over 3}}
```
else if distance < 100km:

```math
distanceFactor = {0.5 \over 0.9} (1 - 0.001x)
```

else
```math
distanceFactor = 0
```

![distance](https://github.com/directdemocracy-vote/judge/assets/25938827/7a636356-f53a-48b2-b4bf-3768f2c39d37)
The red line is followed until 10km, and then we take the blue line into account.
