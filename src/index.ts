
import { parseArgs } from "./args";
import { readFileAndProcess } from "./parsing";

const main = () => {
  const options = parseArgs();

  if (options.verbose) {
    console.log("Running with options:");
    console.log(options);
  }

  const result = readFileAndProcess(options.filePath);

  result.forEach((data) => {
    console.log(`\nFile: ${data.path}`);

    if (options.outputFormat === "json") {
      console.log(JSON.stringify(data.coverage, null, 2));
    } else {
      console.table(data.coverage);

      if (options.verbose) {
        const uncoveredFunctions = data.data.filter((d) => !d.isFullyCovered);
        if (uncoveredFunctions.length > 0) {
          console.log("\nNot fully covered functions:");
          console.table(
            uncoveredFunctions.map((d) => ({
              functionName: d.functionName,
              touched: d.touched,
              reverted: d.reverted,
            }))
          );
        }
      }
    }

    if (data.coverage.coveragePercentage < options.threshold) {
      console.log(
        `\nWarning ❌: Coverage ${data.coverage.coveragePercentage}% below threshold ${options.threshold}%`
      );
    }
  });
};

main();

// ex: ts-node index.ts -v -f ./data/test.txt --format table -t 90
