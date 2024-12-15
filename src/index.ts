import { parseArgs } from "./args";
import { readFileAndProcess } from "./parsing";
import { style, ICONS } from './style';

const main = () => {
  const options = parseArgs();

  let result = readFileAndProcess(options.filePath);
  if (options.contract) {
    result = result.filter((file) =>
      file.path.toLowerCase().includes(options.contract!.toLowerCase())
    );
  }
  result.forEach((data) => {
    console.log("\n");
    console.log(style.dim("═".repeat(50)));
    console.log(style.header(`${ICONS.FILE} File: ${data.path}`));
    console.log(style.dim("═".repeat(50)));

    if (options.outputFormat === "json") {
      console.log(JSON.stringify(data.coverage, null, 2));
    } else {
      console.table(data.coverage);

      if (options.verbose) {
        const uncoveredFunctions = data.data.filter((d) => !d.isFullyCovered);
        if (uncoveredFunctions.length > 0) {
          console.log(style.warning(`\n${ICONS.WARNING} Not fully covered functions:`));
          console.table(
            uncoveredFunctions.map((d) => ({
              functionName: d.functionName,
              touched: d.touched,
              reverted: d.reverted,
              untouchedLines: d.untouchedLines,
            }))
          );

          if (options.veryVerbose) {
            uncoveredFunctions.forEach((f) => {
              if (f.untouchedContent.length > 0 || f.revertedContent.length > 0) {
                console.log(style.header(`\nFunction: ${f.functionName}`));
              }
              if (f.untouchedContent.length > 0) {
                console.log(style.error(`${ICONS.ERROR} Untouched lines:`));
                f.untouchedContent.forEach((line) => {
                  console.log(style.dim(line));
                });
              }
              if (f.revertedContent.length > 0) {
                console.log(style.warning(`\n${ICONS.WARNING} Reverted lines:`));
                f.revertedContent.forEach((line) => {
                  console.log(style.dim(line));
                });
              }
            });
          }
        }
      }
    }

    if (data.coverage.coveragePercentage < options.threshold) {
      console.log(style.error(
        `\n${ICONS.ERROR} Warning: Coverage ${data.coverage.coveragePercentage}% below threshold ${options.threshold}%`
      ));
    }

    console.log(style.dim("═".repeat(50)));
  });
};

main();

// ex: ts-node index.ts -v -f ./data/test.txt --format table -t 90 --contract xxx.sol
