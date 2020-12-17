import { structSquare } from "./morphology";

export const invert = (binRep: number[][]) => {
  const height = binRep.length;
  const width = binRep[0].length;
  const binRepCopy = [...Array(height)].map((e) => Array(width));
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      binRepCopy[i][j] = binRep[i][j] ? 0 : 1;
    }
  }
  return binRepCopy;
};

export const getLength = (binRep: number[][], scale: number) => {
  let length = 0;
  const height = binRep.length;
  const width = binRep[0].length;
  const visited = [...Array(height)].map((e) => Array(width).fill(0));
  const boundaries = [
    // row
    [
      [-1, 0],
      [1, 0],
    ],
    // column
    [
      [0, -1],
      [0, 1],
    ],
  ];
  // search for first pixel
  toploop: for (let x = 0; x < height; x++) {
    for (let y = 0; y < width; y++) {
      if (binRep[x][y] === 1) {
        // start dfs
        const stack = [[x, y]];
        visited[x][y] = 1;
        while (stack.length > 0) {
          const curr = stack.pop();
          if (curr) {
            const i = curr[0];
            const j = curr[1];
            for (let s = 0; s < structSquare.length; s++) {
              const offset = structSquare[s];
              const iOffset = offset[0];
              const jOffset = offset[1];
              const iNew = i + iOffset;
              const jNew = j + jOffset;
              if (iNew >= 0 && iNew < height && jNew >= 0 && jNew < width) {
                if (binRep[iNew][jNew] === 1 && visited[iNew][jNew] !== 1) {
                  if (iOffset === 0 || jOffset === 0) {
                    const bIndex = iOffset === 0 ? 0 : 1;
                    const bounds = boundaries[bIndex];
                    let ignore = false;
                    for (let z = 0; z < bounds.length; z++) {
                      const iBound = iNew + bounds[z][0];
                      const jBound = jNew + bounds[z][1];
                      if (
                        iBound >= 0 &&
                        iBound < height &&
                        jBound >= 0 &&
                        jBound < width
                      ) {
                        if (binRep[iBound][jBound] === 1) {
                          ignore = true;
                        }
                      }
                    }
                    if (!ignore) {
                      length++;
                    }
                  } else {
                    length += Math.sqrt(2);
                  }
                  stack.push([iNew, jNew]);
                  visited[iNew][jNew] = 1;
                }
              }
            }
          }
        }
        break toploop;
      }
    }
  }
  return (length * (1 / scale)) / 3.06;
};

export const contrastAdaptive = (greyscaleRep: number[][], radius: number) => {
  const height = greyscaleRep.length;
  const width = greyscaleRep[0].length;
  const contrastRep = [...Array(height)].map((e) => Array(width));
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      let rank = 0;
      let blockWidth = radius * 2 + 1;
      let regionSize = blockWidth * blockWidth;
      const value = greyscaleRep[i][j];
      for (let a = i - radius; a <= i + radius; a++) {
        for (let b = j - radius; b <= j + radius; b++) {
          let iNew = a;
          let jNew = b;
          if (a < 0) {
            iNew = -(a + 1);
          } else if (a >= height) {
            iNew = -(a - height) + height - 1;
          }
          if (b < 0) {
            jNew = -(b + 1);
          } else if (b >= width) {
            jNew = -(b - width) + width - 1;
          }
          if (value > greyscaleRep[iNew][jNew]) {
            rank++;
          }
        }
      }
      contrastRep[i][j] = Math.floor((rank / regionSize) * 255 + 0.5);
    }
  }
  return contrastRep;
};

export const contrastLimitedAdaptive = (
  greyscaleRep: number[][],
  radius: number,
  clip: number
) => {
  const height = greyscaleRep.length;
  const width = greyscaleRep[0].length;
  const contrastRep = [...Array(height)].map((e) => Array(width));
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      let blockWidth = radius * 2 + 1;
      let regionSize = blockWidth * blockWidth;
      const value = greyscaleRep[i][j];
      const cdf = Array(256).fill(0);
      let numClipped = 0;
      for (let a = i - radius; a <= i + radius; a++) {
        for (let b = j - radius; b <= j + radius; b++) {
          let iNew = a;
          let jNew = b;
          if (a < 0) {
            iNew = -(a + 1);
          } else if (a >= height) {
            iNew = -(a - height) + height - 1;
          }
          if (b < 0) {
            jNew = -(b + 1);
          } else if (b >= width) {
            jNew = -(b - width) + width - 1;
          }
          // clip
          if (cdf[greyscaleRep[iNew][jNew]] >= clip) {
            numClipped++;
          } else {
            cdf[greyscaleRep[iNew][jNew]]++;
          }
        }
      }
      let sliced = cdf.slice(0, value);
      let rank = 0;
      if (sliced.length > 0) {
        rank = cdf
          .slice(0, value)
          .reduce((accumulator, currentValue) => accumulator + currentValue);
      }
      // add clips to bottom
      rank += (value / 255) * numClipped;
      contrastRep[i][j] = Math.floor((rank / regionSize) * 255 + 0.5);
    }
  }
  return contrastRep;
};
