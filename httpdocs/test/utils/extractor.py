#!/usr/bin/env python3

# Use this script to extract the information (population total, by age) for a given rectangle

import csv
import os

# Define rectangle
top = 1164600
bottom = 1155100
left = 2523400
right = 2532900

with open(os.environ['HOME'] + '/Downloads/ag-b-00.03-vz2022statpop/STATPOP2022.csv', mode='r') as csv_file:
    csv_reader = csv.reader(csv_file, delimiter=';')
    line_count = 0
    with open('density.csv', mode='w') as result_file:
        csv_writer = csv.writer(result_file, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        for row in csv_reader:
            if line_count == 0 or ( int(row[1]) >= left and int(row[1]) <= right and int(row[2]) >= bottom and int(row[2]) <= top):
                # Keep only the coordinates, the total number of inhabitant and the detail per age.
                csv_writer.writerow([row[1], row[2], row[3], row[21], row[22], row[23], row[24], row[25], row[26], row[27],
                row[28], row[29], row[30], row[31], row[32], row[33], row[34], row[35], row[36], row[37], row[38], row[39],
                row[41], row[42], row[43], row[44], row[45], row[46], row[47], row[48], row[49], row[50], row[51], row[52],
                row[53], row[54], row[55], row[56], row[57], row[58], row[59]])

            line_count += 1
    print(f'Processed {line_count} lines.')
