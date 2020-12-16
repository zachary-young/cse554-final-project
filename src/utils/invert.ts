const invert = (binRep: number[][]) => {
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

export default invert;
