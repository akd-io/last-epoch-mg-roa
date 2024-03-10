import { readdir } from "fs/promises";
import path from "path";
import { notNull, printPercentage } from "./utils";

const metaDir = import.meta.dir;
const dataDirPath = path.join(metaDir, "data");

const dataDir = await readdir(dataDirPath);

const cleanName = (name: string) => {
  return name.toLowerCase().replace("'", "").trim();
};

for (const category of dataDir) {
  const tsmFile = Bun.file(path.join(dataDirPath, category, "tsm.txt"));
  const tsmText = await tsmFile.text();

  /* Example tsm file:
    **ONE-HANDED AXE:**
    - Beast King (3LP)
    - Cleaver Solution (2LP)
    - Eulogy of Blood (2LP)
    - Hakars Phoenix (2LP)
    - Pact Severance (2LP)
    - Taste of Blood (3LP)
    - Tempest Maw (3LP)
    - Undisputed (2LP)
  */

  const tsmItems = tsmText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- ") && line.includes(" ("))
    .map((line) => line.replace("- ", "").trim())
    .map((line) => {
      if (!line.includes(" (")) {
        return {
          name: cleanName(line),
          lps: [],
        };
      } else {
        const [left, right] = line.split(" (");
        // find instances of 0LP, 1LP, 2LP, 3LP, 4LP in right
        const lpsMatches = right.match(/\dLP/g);
        return {
          name: cleanName(left),
          lps: lpsMatches
            ? lpsMatches.map((lpMatch) => lpMatch.replace("LP", ""))
            : [],
        };
      }
    });

  const tsmZeroLPItems = tsmItems.filter((item) => item.lps.includes("0"));
  /*
    console.log(
      `TSM 0LPs in ${category}:`,
      tsmZeroLPItems.map((item) => item.name)
    );
  */

  const tunklabFile = Bun.file(path.join(dataDirPath, category, "tunklab.csv"));
  const tunklabCsv = await tunklabFile.text();

  /* Example tunklab file:
    Tempest Maw	794835	15.9%
    Beast King	794269	15.89%
    Cleaver Solution	794096	15.88%
    Taste of Blood	792940	15.86%
    Ruby Fang Cleaver	792596	15.85%
    Undisputed	396922	7.94%
    Pact Severance	396509	7.93%
    Hakar's Phoenix	237833	4.76%
  */

  const tunklabItems = tunklabCsv
    .split("\n")
    .map((line) => line.trim())
    .map((line) => line.split("\t"))
    .map(([name, count, _]) => ({
      name: cleanName(name),
      count,
    }));

  const tunkLabTotalCount = tunklabItems.reduce(
    (acc, { count }) => acc + parseInt(count),
    0
  );
  const tunkLabItemsWithProperPercentages = tunklabItems.map((item) => ({
    ...item,
    percentage: parseInt(item.count) / tunkLabTotalCount,
  }));

  const combinedZeroLPs = tsmZeroLPItems
    .map((unique) => {
      const found = tunkLabItemsWithProperPercentages.find(
        (item) => item.name == unique.name
      );
      if (!found) {
        if (process.env.DEBUG != null) {
          console.debug(`TSM 0LP ${unique.name} not found in Tunklab data!`);
        }
        return null;
      }
      return {
        ...unique,
        ...found,
      };
    })
    .filter(notNull);

  const chanceToHitValuableUniqueInCategory = combinedZeroLPs.reduce(
    (acc, { percentage }) => acc + percentage,
    0
  );
  if (chanceToHitValuableUniqueInCategory > 0) {
    console.log(category, printPercentage(chanceToHitValuableUniqueInCategory));
    combinedZeroLPs.forEach((item) => {
      console.log("-", item.name, printPercentage(item.percentage));
    });
  }
}
