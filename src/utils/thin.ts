import { structSquare } from "./morphology";

export const thinPixel = (
  binRep: number[][],
  lookupTable: Record<string, any>
) => {
  const height = binRep.length;
  const width = binRep[0].length;
  const binRepCopy = binRep.map((e) => e.slice());
  let run = true;
  while (run) {
    run = false;
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        if (binRepCopy[i][j] === 1) {
          let input = "";
          for (let s = 0; s < structSquare.length; s++) {
            const iOffset = structSquare[s][0];
            const jOffset = structSquare[s][1];
            const iNew = i + iOffset;
            const jNew = j + jOffset;
            if (iNew >= 0 && iNew < height && jNew >= 0 && jNew < width) {
              if (binRepCopy[iNew][jNew] === 1) {
                input += "1";
              } else {
                input += "0";
              }
            } else {
              input += "0";
            }
          }
          if (lookupTable[input] === true) {
            binRepCopy[i][j] = 0;
          }
        }
      }
    }
  }
  return binRepCopy;
};

export const thinCC = (cc: number[][][], thresholds: [number, number]) => {
  // setup table
  const table = cc.map((e) => Array(e.length).fill(0));
  for (let i = 1; i < cc.length; i++) {
    for (let j = 0; j < cc[i].length; j++) {
      for (let k = 0; k < cc[i][j].length; k++) {
        table[i - 1][cc[i][j][k]]++;
      }
    }
  }
  const resultMask = cc.map((e) => Array(e.length).fill(true));
  const isolated: (number | null)[][] = [];
  for (let i = 0; i < cc.length; i++) {
    isolated.push([]);
    for (let j = 0; j < cc[i].length; j++) {
      if (i !== cc.length) {
        if (table[i][j] === 0) {
          isolated[i].push(0);
        } else {
          isolated[i].push(null);
        }
      } else {
        isolated[i].push(0);
      }
    }
  }
  let tableTemp = table.map((e) => e.slice());
  let cont = true;
  let iterations = 0;
  while (cont) {
    iterations++;
    let table = tableTemp.map((e) => e.slice());
    cont = false;
    for (let i = cc.length - 1; i > 0; i--) {
      for (let j = 0; j < cc[i].length; j++) {
        if (resultMask[i][j] === true) {
          const parentLength = cc[i][j].length;
          for (let k = 0; k < parentLength; k++) {
            const childIndex = cc[i][j][k];
            if (table[i - 1][childIndex] === 1) {
              const iso = isolated[i][j];
              if (
                i === 2 &&
                iso !== null &&
                iterations - iso > thresholds[0] &&
                1 - iso / iterations > thresholds[1]
              ) {
                break;
              }
              resultMask[i][j] = false;
              resultMask[i - 1][childIndex] = false;
              for (let x = 0; x < parentLength; x++) {
                tableTemp[i - 1][cc[i][j][x]]--;
                if (tableTemp[i - 1][cc[i][j][x]] === 0) {
                  isolated[i - 1][cc[i][j][x]] = iterations;
                }
              }
              if (i - 2 >= 0) {
                for (let x = 0; x < cc[i - 1][childIndex].length; x++) {
                  tableTemp[i - 2][cc[i - 1][childIndex][x]]--;
                  if (tableTemp[i - 2][cc[i - 1][childIndex][x]] === 0) {
                    isolated[i - 2][cc[i - 1][childIndex][x]] = iterations;
                  }
                }
              }
              cont = true;
              break;
            }
          }
        }
      }
    }
  }
  const result = [];
  for (let i = 0; i < resultMask.length; i++) {
    const tempList: number[][] = [];
    let tempIndex = 1;
    const tempMap: Record<number, number> = {};
    for (let j = 0; j < resultMask[i].length; j++) {
      if (resultMask[i][j] === true) {
        tempMap[j] = tempIndex;
        tempList.push(cc[i][j]);
        tempIndex++;
      }
    }
    result.push(tempList);
    if (i + 1 < cc.length) {
      for (let j = 0; j < cc[i + 1].length; j++) {
        for (let k = 0; k < cc[i + 1][j].length; k++) {
          cc[i + 1][j][k] = tempMap[cc[i + 1][j][k]];
        }
      }
    }
  }
  return result;
};

export const ccToBin = (
  cc: number[][][],
  height: number,
  width: number,
  lookupTable: Record<string, any>
) => {
  let binRep = [...Array(height)].map((e) => Array(width).fill(0));
  // iterate through vertices
  for (let i = 0; i < cc[0].length; i++) {
    const iNew = Math.floor((cc[0][i][0] + 1) / 2) - 1;
    const jNew = Math.floor((cc[0][i][1] + 1) / 2);
    if (iNew >= 0 && iNew < height && jNew >= 0 && jNew < width) {
      binRep[iNew][jNew] = 1;
    }
  }
  // remove artifacts
  return thinPixel(binRep, lookupTable);
};

export const ccToGreyscale = (
  cc: number[][][],
  height: number,
  width: number
) => {
  let binRep = [...Array(height)].map((e) => Array(width).fill(0));
  // iterate through vertices
  for (let i = 0; i < cc[0].length; i++) {
    const iNew = cc[0][i][0];
    const jNew = cc[0][i][1];
    if (iNew < height && jNew < width) {
      binRep[iNew][jNew] = 255;
    }
  }
  // iterate through edges
  for (let i = 0; i < cc[1].length; i++) {
    const child1 = cc[0][cc[1][i][0]];
    const child2 = cc[0][cc[1][i][1]];
    const iNew = (child1[0] + child2[0]) / 2;
    const jNew = (child1[1] + child2[1]) / 2;
    if (iNew < height && jNew < width) {
      binRep[iNew][jNew] = 125;
    }
  }
  return binRep;
};

export const buildCC = (binRep: number[][]) => {
  const height = binRep.length;
  const width = binRep[0].length;
  const indexArray: number[][] = [...Array(2 * height + 1)].map((e) =>
    Array(2 * width + 1).fill(0)
  );
  const cc: number[][][] = [[], [], []];
  let zeroCellCounter = 1;
  let oneCellCounter = 1;
  let twoCellCounter = 1;

  const zeroCellOffsets = [
    [-1, -1],
    [-1, 1],
    [1, 1],
    [1, -1],
  ];
  const oneCellOffsets = [
    [-1, 0],
    [0, 1],
    [1, 0],
    [0, -1],
  ];
  const oneCellBoundaries = [
    [
      [-1, 0],
      [1, 0],
    ],
    [
      [0, -1],
      [0, 1],
    ],
  ];
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      if (binRep[i][j] === 1) {
        // zero cell
        for (let a = 0; a < zeroCellOffsets.length; a++) {
          const iNew = 2 * i + zeroCellOffsets[a][0] + 1;
          const jNew = 2 * j + zeroCellOffsets[a][1] + 1;
          if (indexArray[iNew][jNew] === 0) {
            indexArray[iNew][jNew] = zeroCellCounter;
            cc[0].push([iNew, jNew]);
            zeroCellCounter++;
          }
        }
        // one cell
        for (let b = 0; b < oneCellOffsets.length; b++) {
          const iNew = 2 * i + oneCellOffsets[b][0] + 1;
          const jNew = 2 * j + oneCellOffsets[b][1] + 1;
          if (indexArray[iNew][jNew] === 0) {
            indexArray[iNew][jNew] = oneCellCounter;
            const temp = (iNew + 1) % 2; // may need to change
            cc[1].push([
              indexArray[iNew + oneCellBoundaries[temp][0][0]][
                jNew + oneCellBoundaries[temp][0][1]
              ] - 1,
              indexArray[iNew + oneCellBoundaries[temp][1][0]][
                jNew + oneCellBoundaries[temp][1][1]
              ] - 1,
            ]);
            oneCellCounter++;
          }
        }
        // two cell
        const iNew = i * 2 + 1;
        const jNew = j * 2 + 1;
        if (indexArray[iNew][jNew] === 0) {
          indexArray[iNew][jNew] = twoCellCounter;
          cc[2].push([
            indexArray[iNew + oneCellOffsets[0][0]][
              jNew + oneCellOffsets[0][1]
            ] - 1,
            indexArray[iNew + oneCellOffsets[1][0]][
              jNew + oneCellOffsets[1][1]
            ] - 1,
            indexArray[iNew + oneCellOffsets[2][0]][
              jNew + oneCellOffsets[2][1]
            ] - 1,
            indexArray[iNew + oneCellOffsets[3][0]][
              jNew + oneCellOffsets[3][1]
            ] - 1,
          ]);
          twoCellCounter++;
        }
      }
    }
  }
  return cc;
};

export const generateBinaryInputs = (n: number): string[] => {
  if (n === 0) {
    return [];
  } else if (n === 1) {
    return ["0", "1"];
  }
  const ends = generateBinaryInputs(n - 1);
  const result = [];
  for (let i = 0; i < ends.length; i++) {
    result.push("0" + ends[i]);
    result.push("1" + ends[i]);
  }
  return result;
};

export const generateLookupTable = () => {
  const inputs = generateBinaryInputs(8);
  const curveEndPixels = [
    [0, 1],
    [1, 0],
    [1, 2],
    [2, 1],
  ];
  const result: Record<string, boolean> = {};
  inputLoop: for (let i = 0; i < inputs.length; i++) {
    // construct matrix
    const matrixInput = [...Array(3)].map((e) => Array(3)) as Matrix;
    const input = inputs[i];
    let sumPixels = 0;
    for (let j = 0; j < input.length; j++) {
      const num = Number(input.charAt(j));
      if (num === 1) {
        sumPixels++;
      }
      let index = j;
      if (j > 3) {
        index++;
      }
      matrixInput[Math.floor(index / 3)][index % 3] = num;
    }
    matrixInput[1][1] = 1;
    // check connectivity
    if (sumPixels === 1) {
      for (let j = 0; j < curveEndPixels.length; j++) {
        const iNew = curveEndPixels[j][0];
        const jNew = curveEndPixels[j][1];
        if (matrixInput[iNew][jNew] === 1) {
          result[input] = false;
          continue inputLoop;
        }
      }
    }
    // check for simple pixels
    const { countForeground, countBackground } = countObjects(matrixInput);
    const matrixAfter = matrixInput.map((e) => e.slice()) as Matrix;
    matrixAfter[1][1] = 0;
    const {
      countForeground: countForegroundAfter,
      countBackground: countBackgroundAfter,
    } = countObjects(matrixAfter);
    if (
      countForeground !== countForegroundAfter ||
      countBackground !== countBackgroundAfter
    ) {
      result[input] = false;
      continue;
    }
    // otherwise set to true
    result[input] = true;
  }
  return result;
};

type Row = [number, number, number];
type Matrix = [Row, Row, Row];

export const countObjects = (matrix: Matrix) => {
  const visited = [...Array(3)].map((e) => Array(3).fill(0));
  const searchOffsets = [
    [-1, 0],
    [0, -1],
    [0, 1],
    [1, 0],
  ];
  let countBackground = 0;
  let countForeground = 0;
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
      if (visited[x][y] !== 1) {
        if (matrix[x][y] === 1) {
          countForeground++;
        } else {
          countBackground++;
        }
        const stack = [[x, y]];
        visited[x][y] = 1;
        while (stack.length > 0) {
          const curr = stack.pop();
          if (curr) {
            const i = curr[0];
            const j = curr[1];
            const value = matrix[i][j];
            for (let s = 0; s < searchOffsets.length; s++) {
              let offset = searchOffsets[s];
              let iNew = i + offset[0];
              let jNew = j + offset[1];
              if (iNew >= 0 && iNew < 3 && jNew >= 0 && jNew < 3) {
                if (matrix[iNew][jNew] === value && visited[iNew][jNew] !== 1) {
                  stack.push([iNew, jNew]);
                  visited[iNew][jNew] = 1;
                }
              }
            }
          }
        }
      }
    }
  }
  return { countForeground, countBackground };
};
