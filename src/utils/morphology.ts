import invert from "./invert";

// dilate[img_, str_, r_] :=
//  Module[{dimensions, w, x, y, pair, xOffset, yOffset, xNew, yNew,
//    imgBefore, imgAfter},
//   dimensions = Dimensions[img];
//   imgBefore = img;
//   imgAfter = img;
//   For[w = 1, w <= r, w++,
//    For[x = 1, x <= dimensions[[1]], x++,
//     For[y = 1, y <= dimensions[[2]], y++,
//      If[imgBefore[[x, y]] == 1,
//        For[z = 1, z <= Length[str], z++,
//          pair = str[[z]];
//          xOffset = pair[[1]];
//          yOffset = pair[[2]];
//          xNew = x + xOffset;
//          yNew = y + yOffset;
//          If [
//           xNew < 1 || xNew > dimensions[[1]] || yNew < 1 ||
//            yNew > dimensions[[2]], Continue[]];
//          imgAfter[[xNew, yNew]] = 1;
//          ];
//        ];
//      ]
//     ];
//    imgBefore = imgAfter;
//    ];
//   imgAfter
//   ]

export const dilate = (
  binRep: number[][],
  struct: number[][],
  iterations: number
) => {
  const height = binRep.length;
  const width = binRep[0].length;
  const binRepCopy = binRep.map((e) => e.slice());
  for (let r = 0; r < iterations; r++) {
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        if (binRep[i][j] === 1) {
          for (let s = 0; s < struct.length; s++) {
            const iOffset = struct[s][0];
            const jOffset = struct[s][1];
            const iNew = i + iOffset;
            const jNew = j + jOffset;
            if (iNew >= 0 && iNew < height && jNew >= 0 && jNew < width) {
              binRepCopy[iNew][jNew] = 1;
            }
          }
        }
      }
    }
    binRep = binRepCopy.map((e) => e.slice());
  }
  return binRepCopy;
};

export const erode = (
  binRep: number[][],
  struct: number[][],
  iterations: number
) => {
  return invert(dilate(invert(binRep), struct, iterations));
};

export const open = (
  binRep: number[][],
  struct: number[][],
  iterations: number
) => {
  return dilate(erode(binRep, struct, iterations), struct, iterations);
};

export const close = (
  binRep: number[][],
  struct: number[][],
  iterations: number
) => {
  return erode(dilate(binRep, struct, iterations), struct, iterations);
};

export const structSquare = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
  [1, 0],
  [1, -1],
  [0, -1],
];

export const structCross = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

export const flood = (
  binRep: number[][],
  start: [number, number],
  struct: number[][]
) => {
  const height = binRep.length;
  const width = binRep[0].length;
  const visited = [...Array(height)].map((e) => Array(width).fill(0));
  const resultSet: number[][] = [];
  let count = 0;
  if (binRep[start[0]][start[1]] === 0) {
    return { result: resultSet, count };
  }
  visited[start[0]][start[1]] = 1;
  const stack = [start];
  count++;
  while (stack.length !== 0) {
    const current = stack.pop();
    if (current) {
      const i = current[0];
      const j = current[1];
      for (let c = 0; c < struct.length; c++) {
        const iOffset = struct[c][0];
        const jOffset = struct[c][1];
        const iNew = i + iOffset;
        const jNew = j + jOffset;
        if (iNew >= 0 && iNew < height && jNew >= 0 && jNew < width) {
          if (binRep[iNew][jNew] === 1 && visited[iNew][jNew] === 0) {
            count++;
            visited[iNew][jNew] = 1;
            resultSet.push([iNew, jNew]);
            stack.push([iNew, jNew]);
          }
        }
      }
    }
  }
  return { result: resultSet, count };
};

export const labelComponents = (binRep: number[][], struct: number[][]) => {
  const height = binRep.length;
  const width = binRep[0].length;
  let resultSet = [...Array(height)].map((e) => Array(width).fill(0));
  let index = 1;
  const indexCount: number[][] = [];
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      if (binRep[i][j] === 1 && resultSet[i][j] === 0) {
        const { result, count } = flood(binRep, [i, j], struct);
        for (let a = 0; a < result.length; a++) {
          const iNew = result[a][0];
          const jNew = result[a][1];
          resultSet[iNew][jNew] += index;
        }
        indexCount.push([index, count]);
        index++;
      }
    }
  }
  return { result: resultSet, counts: indexCount };
};

// getLargestComponents[img_, k_, conn_] :=
//  Module[{numComponents, labelCounts, labelled, dimensions, resultSet,
//    x, y, w, sorted},
//   numComponents = numberComponents[img, conn];
//   labelCounts = Table[{i, 0}, {i, numComponents}];
//   labelled = labelComponents[img, conn];
//   dimensions = Dimensions[img];
//   resultSet = Table[Table[0, {dimensions[[2]]}], {dimensions[[1]]}];
//   For[x = 1, x <= dimensions[[1]], x++,
//    For[y = 1, y <= dimensions[[2]], y++,
//      If[labelled[[x, y]] != 0,
//        labelCounts[[labelled[[x, y]], 2]] =
//          labelCounts[[labelled[[x, y]], 2]] + 1;
//        ];
//      ];
//    ];
//   sorted = Sort[labelCounts, #1[[2]] > #2[[2]] &];
//   For[w = 1, w <= k, w++,
//    For[x = 1, x <= dimensions[[1]], x++,
//      For[y = 1, y <= dimensions[[2]], y++,
//        If[labelled[[x, y]] == sorted[[w, 1]],
//          resultSet[[x, y]] = 1;];
//        ];
//      ];
//    ];
//   resultSet
//   ]

export const getLargestComponents = (
  binRep: number[][],
  k: number,
  struct: number[][]
) => {
  const height = binRep.length;
  const width = binRep[0].length;
  let resultSet = [...Array(height)].map((e) => Array(width).fill(0));
  const { result, counts } = labelComponents(binRep, struct);
  counts.sort((a, b) => b[1] - a[1]);
  for (let i = 0; i < k; i++) {
    const targetIndex = counts[i][0];
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        if (result[i][j] === targetIndex) {
          resultSet[i][j] = 1;
        }
      }
    }
  }
  return resultSet;
};
