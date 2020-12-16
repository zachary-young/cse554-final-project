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
    const matrixInput = [...Array(3)].map((e) => Array(3));
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
    const count = countObjects(matrixInput);
    const matrixAfter = matrixInput.map((e) => e.slice());
    matrixAfter[1][1] = true;
    const countAfter = countObjects(matrixAfter);
    if (count !== countAfter) {
      result[input] = false;
      continue;
    }
    // otherwise set to true
    result[input] = true;
  }
};

export const countObjects = (matrix: number[][]) => {
  const visited = [...Array(3)].map((e) => Array(3).fill(0));
  const searchOffsets = [
    [-1, 0],
    [0, -1],
    [0, 1],
    [1, 0],
  ];
  const stack = [[0, 0]];
  let count = 0;
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
        if (iNew < 3 && jNew < 3) {
          if (matrix[iNew][jNew] === value && visited[iNew][jNew] !== 1) {
            stack.push([iNew, jNew]);
            visited[iNew][jNew] = 1;
          }
        }
      }
    }
  }
  return count;
};
