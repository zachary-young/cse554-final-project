export const binToImg = (binRep: number[][], pixels: Uint8ClampedArray) => {
  const height = binRep.length;
  const width = binRep[0].length;
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      if (binRep[i][j] >= 1) {
        pixels[i * width * 4 + j * 4] = 255;
        pixels[i * width * 4 + j * 4 + 3] = 255;
      }
    }
  }
};

export const greyscaleToBin = (
  greyscaleRep: number[][],
  min: number,
  max: number
) => {
  const height = greyscaleRep.length;
  const width = greyscaleRep[0].length;
  const binRep = [...Array(height)].map((e) => Array(width));
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      if (greyscaleRep[i][j] >= min && greyscaleRep[i][j] <= max) {
        binRep[i][j] = 1;
      } else {
        binRep[i][j] = 0;
      }
    }
  }
  return binRep;
};

export const greyscaleToBinAdaptive = (
  greyscaleRep: number[][],
  radius: number,
  c: number
) => {
  const height = greyscaleRep.length;
  const width = greyscaleRep[0].length;
  const binRep = [...Array(height)].map((e) => Array(width).fill(0));
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      let sum = 0;
      let regionSize = 0;
      for (let a = i - radius; a <= i + radius; a++) {
        for (let b = j - radius; b <= j + radius; b++) {
          if (a >= 0 && a < height && b >= 0 && b < width) {
            regionSize++;
            sum += greyscaleRep[a][b];
          }
        }
      }
      if (greyscaleRep[i][j] > sum / regionSize + c) {
        binRep[i][j] = 1;
      }
    }
  }
  return binRep;
};

export const greyscaleToBinLimitedAdaptive = (
  greyscaleRep: number[][],
  radius: number,
  c: number,
  clip: number
) => {
  const height = greyscaleRep.length;
  const width = greyscaleRep[0].length;
  const reducer = (accumulator: number, currentValue: number) =>
    accumulator + currentValue;
  const sum = greyscaleRep.map((e) => e.reduce(reducer)).reduce(reducer);
  const globalMean = Math.floor(sum / (height * width));
  const binRep = [...Array(height)].map((e) => Array(width).fill(0));
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      let sum = 0;
      let blockWidth = radius * 2 + 1;
      let regionSize = blockWidth * blockWidth;
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
          sum += greyscaleRep[iNew][jNew];
          if (cdf[greyscaleRep[iNew][jNew]] >= clip) {
            numClipped++;
          } else {
            cdf[greyscaleRep[iNew][jNew]]++;
          }
        }
      }
      const localMean = sum / regionSize;
      const uniformity = numClipped / regionSize;
      if (
        greyscaleRep[i][j] >
        (1 - uniformity) * localMean + uniformity * globalMean + c
      ) {
        binRep[i][j] = 1;
      }
    }
  }
  return binRep;
};

export const greyscaleToImg = (
  greyscaleRep: number[][],
  pixels: Uint8ClampedArray
) => {
  const height = greyscaleRep.length;
  const width = greyscaleRep[0].length;
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      pixels[i * width * 4 + j * 4] = greyscaleRep[i][j];
      pixels[i * width * 4 + j * 4 + 1] = greyscaleRep[i][j];
      pixels[i * width * 4 + j * 4 + 2] = greyscaleRep[i][j];
      pixels[i * width * 4 + j * 4 + 3] = 255;
    }
  }
};

export const imgToGreyscale = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number
) => {
  const greyscaleRep = [...Array(height)].map((e) => Array(width));
  for (var i = 0; i < pixels.length; i += 4) {
    const lumen = pixels[i];
    greyscaleRep[Math.floor(i / 4 / height)][(i / 4) % height] = lumen;
  }
  return greyscaleRep;
};
