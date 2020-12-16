import { structCross } from "./morphology";

const thin = (binRep: number[][]) => {
  const height = binRep.length;
  const width = binRep[0].length;
  const binRepCopy = binRep.map((e) => e.slice());
  let run = true;
  while (run) {
    run = false;
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        if (binRepCopy[i][j] === 1) {
          let horizontalCount = 0;
          let verticalCount = 0;
          for (let s = 0; s < structCross.length; s++) {
            const iOffset = structCross[s][0];
            const jOffset = structCross[s][1];
            const iNew = i + iOffset;
            const jNew = j + jOffset;
            if (iNew >= 0 && iNew < height && jNew >= 0 && jNew < width) {
              if (binRepCopy[iNew][jNew] === 1) {
                if (s % 2 === 0) {
                  horizontalCount++;
                } else {
                  verticalCount++;
                }
              }
            }
          }
          const totalCount = horizontalCount + verticalCount;
          if (
            totalCount === 0 ||
            totalCount === 1 ||
            totalCount === 4 ||
            horizontalCount === 2 ||
            verticalCount === 2
          ) {
          } else {
            binRepCopy[i][j] = 1;
            binRepCopy[i][j] = 0;
            run = true;
          }
        }
      }
    }
  }
  return binRepCopy;
};

export default thin;
