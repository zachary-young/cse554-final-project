const greyscaleToBin = (greyscaleRep: number[][], min: number, max: number) => {
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

export default greyscaleToBin;
