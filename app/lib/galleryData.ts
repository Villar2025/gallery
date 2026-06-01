export const PAD_LENGTH = 5; // 00001, 00002, ...
export const BASE_PATH = "/svgs-inline";
export const TOTAL_SVGS = 820; // 👈 update if you add/remove files

// Generate list of SVG URLs using the naming convention webapp00001.svg ... webapp00820.svg
export const imageData = Array.from({ length: TOTAL_SVGS }, (_, i) => {
  const n = String(i + 1).padStart(PAD_LENGTH, "0");
  return `${BASE_PATH}/webapp${n}.svg`;
});
