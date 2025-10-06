import { DEFAULT_CONFIG } from "../config";
import { ProgramOptions } from "../types/types";

function showHelp(): void {
  console.log(`
Coverage Report Generator

Usage:
  npm run coverage [options]

Options:
  -h, --help              Show this help message
  -v, --verbose          Show detailed output
  -vv, --very-verbose    Show very detailed output
  -f, --file <path>      Path to coverage file (default: ./data/test.txt)
  -ef, --echidna-folder <path>      Path to echidna folder
  --format <type>        Output format: 'table' or 'json' (default: table)
  -t, --threshold <n>    Coverage threshold percentage (default: 70)
  -c, --contract <name>      Contract name to filter, accept array of contracts as well
  -cm, --condensed-mode  Condensed mode
  -af, --all-functions    Show all functions ( default to hide pure and view functions)
  -s, --scope-file <path>  Path to scope.csv file for total coverage calculation
  --source-only          Exclude all fuzzing and test folders from coverage
  --logical              Report only files in logicalCoverage/ folder matching logical*.sol pattern
  --exclude <names>      Exclude specific interface names, e.g., "[IContract1, IContract2]"
  `);
  process.exit(0);
}

export function parseArgs(): ProgramOptions {
  const args = process.argv.slice(2);
  const options = { ...DEFAULT_CONFIG };

  try {
    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case "--help":
        case "-h":
          options.help = true;
          break;
        case "-af":
        case "--all-functions":
          options.allFunctions = true;
          break;
        case "-cm":
        case "--condensed-mode":
          options.condensedMode = true;
          break;
        case "--verbose":
        case "-v":
          options.verbose = true;
          break;
        case "--very-verbose":
        case "-vv":
          options.verbose = true;
          options.veryVerbose = true;
          break;
        case "--file":
        case "-f":
          options.filePath = args[++i];
          break;
        case "--echidna-folder":
        case "-ef":
          options.echidnaFolder = args[++i];
          break;
        case "--format":
          const format = args[++i];
          if (format !== "table" && format !== "json") {
            throw new Error(`Invalid format: ${format}`);
          }
          options.outputFormat = format;
          break;
        case "--threshold":
        case "-t":
          const threshold = Number(args[++i]);
          if (isNaN(threshold)) {
            throw new Error(`Invalid threshold: ${args[i]}`);
          }
          options.threshold = threshold;
          break;
        case "--contract":
        case "-c":
            if (!args[i + 1] || args[i + 1].startsWith("-")) {
              throw new Error("Contract name is required");
            }
            options.contract = args[++i];
            break;
        case "--scope-file":
        case "-s":
            if (!args[i + 1] || args[i + 1].startsWith("-")) {
              throw new Error("Scope file path is required");
            }
            options.scopeFile = args[++i];
            break;
        case "--source-only":
            options.sourceOnly = true;
            break;
        case "--logical":
            options.logical = true;
            break;
        case "--exclude":
            if (!args[i + 1] || args[i + 1].startsWith("-")) {
              throw new Error("Exclude list is required");
            }
            options.exclude = args[++i];
            break;
        default:
          throw new Error(`Unknown option: ${args[i]}`);
      }
    }
  } catch (error) {
    console.error(`Error: ${error}`);
    showHelp();
  }

  if (options.help) {
    showHelp();
  }

  return options;
}
