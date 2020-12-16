const imgToGreyscale = (
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

export default imgToGreyscale;
