
/**
 * encode category, subcatogory, and signal to name code
 * @param  {string}   cat
 * @param  {string}   sub
 * @param  {string}   sig
 * @return  {string[]}   the three codes, an array with less than three elements indicates error.
 */

function nameEncoding(cat, sub, sig, numbering) {
  let c;
  let b;
  let g;
  const result = [null, null, null];
  for (c in numbering) {
    if (numbering.hasOwnProperty(c) && numbering[c].name === cat) {
      result[0] = c;
      for (b in numbering[c].subcategory) {
        if (numbering[c].subcategory.hasOwnProperty(b) && numbering[c].subcategory[b] === sub) {
          result.push(b);
          result[1] = b;
        }
      }
      for (g in numbering[c].signal) {
        if (numbering[c].signal.hasOwnProperty(g) && numbering[c].signal[g].name === sig) {
          result[2] = g;
        }
      }
    }
  }
  return result;
}

export = {
  encode: nameEncoding,
};
