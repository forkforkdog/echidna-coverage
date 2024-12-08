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
  -f, --file <path>      Path to coverage file (default: ./data/test.txt)
  --format <type>        Output format: 'table' or 'json' (default: table)
  -t, --threshold <n>    Coverage threshold percentage (default: 0)
  -c, --contract <name>      Contract name
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
        case "--verbose":
        case "-v":
          options.verbose = true;
          break;
        case "--file":
        case "-f":
          options.filePath = args[++i];
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
