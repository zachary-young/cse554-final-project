const binToImg = (binRep: number[][], pixels: Uint8ClampedArray) => {
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

export default binToImg;
