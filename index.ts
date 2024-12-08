import * as fs from "fs";
import * as path from "path";

interface LineData {
  functionName: string;
  touched: boolean;
  reverted: boolean;
  isFullyCovered: boolean;
}

interface FileData {
  path: string;
  data: LineData[];
}

interface CoverageStats {
  totalFunctions: number;
  coveredLines: number;
  revertedLines: number;
  untouchedLines: number;
  coveragePercentage: number;
  fullyCoveredFunctions: number;
}

interface FileDataWithCoverage extends FileData {
  coverage: CoverageStats;
}

interface FunctionBlock {
  name: string;
  lines: string[];
  isCovered: boolean;
  isReverted: boolean;
  coveredLines: number;
  untouchedLines: number;
  revertedLines: number;
  isTotallyCovered: boolean;
}

interface ProgramOptions {
  verbose: boolean;
  filePath: string;
  outputFormat: 'table' | 'json';
  threshold: number;
  help: boolean;
}

const DEFAULT_CONFIG: ProgramOptions = {
  verbose: false,
  filePath: './data/test.txt',
  outputFormat: 'table',
  threshold: 0,
  help: false
};

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
  `);
  process.exit(0);
}

function parseArgs(): ProgramOptions {
  const args = process.argv.slice(2);
  const options = { ...DEFAULT_CONFIG };

  try {
    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case '--help':
        case '-h':
          options.help = true;
          break;
        case '--verbose':
        case '-v':
          options.verbose = true;
          break;
        case '--file':
        case '-f':
          options.filePath = args[++i];
          break;
        case '--format':
          const format = args[++i];
          if (format !== 'table' && format !== 'json') {
            throw new Error(`Invalid format: ${format}`);
          }
          options.outputFormat = format;
          break;
        case '--threshold':
        case '-t':
          const threshold = Number(args[++i]);
          if (isNaN(threshold)) {
            throw new Error(`Invalid threshold: ${args[i]}`);
          }
          options.threshold = threshold;
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

function parseFunctions(lines: string[]): FunctionBlock[] {
  const functions: FunctionBlock[] = [];
  let currentFunction: FunctionBlock | null = null;
  let bracketCount = 0;
  let functionBodyStarted = false;
  let isViewExternal = false;
  let functionStartLine = 0;

  lines.forEach((line, index) => {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length < 3) return;

    const content = parts[2];
    const functionMatch = content.match(
      /function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/
    );

    // Check for function start
    if (functionMatch) {
      bracketCount = 0;
      functionBodyStarted = false;
      functionStartLine = index;
      isViewExternal = false;

      // Check if the function declaration line contains both view and external
      if (content.includes("external") && content.includes("view")) {
        isViewExternal = true;
      }

      currentFunction = {
        name: functionMatch[1],
        lines: [],
        isCovered: false,
        isReverted: false,
        coveredLines: 1,
        untouchedLines: 0,
        revertedLines: 0,
        isTotallyCovered: false,
      };
    }

    // Check lines between function declaration and opening brace for view/external
    if (currentFunction && !functionBodyStarted) {
      if (
        content.trim() === "external" ||
        content.trim() === "view" ||
        (content.includes("external") && content.includes("view"))
      ) {
        isViewExternal = true;
      }
    }

    if (currentFunction) {
      currentFunction.lines.push(line);

      if (content.includes("{")) {
        bracketCount++;
        if (bracketCount === 1) {
          functionBodyStarted = true;
          // If we found both view and external, discard this function
          if (isViewExternal) {
            currentFunction = null;
            return;
          }
          return;
        }
      }

      if (functionBodyStarted) {
        const trimmedContent = content.trim();
        if (trimmedContent === "}") {
          // Don't count closing brace
          null;
        } else if (parts[1] === "*") {
          currentFunction.coveredLines++;
          currentFunction.isCovered = true;
        } else if (parts[1] === "r") {
          currentFunction.revertedLines++;
          currentFunction.isReverted = true;
        } else if (parts[1] === "" && isUntouchedLine(content)) {
          console.log("untouched -> ", trimmedContent);
          currentFunction.untouchedLines++;
        }
      }

      if (content.includes("}")) {
        bracketCount--;
        if (bracketCount === 0 && currentFunction && !isViewExternal) {
          functions.push(currentFunction);
          currentFunction = null;
          functionBodyStarted = false;
        }
      }
    }
  });

  functions.map((f) => {
    if (f.coveredLines > 0 && f.untouchedLines === 0 && f.revertedLines === 0) {
      f.isTotallyCovered = true;
    }
  });

  return functions;
}

function isUntouchedLine(content: string): boolean {
  const trimmedContent = content.trim();

  // Skip empty lines
  if (trimmedContent === "") return false;

  // Skip function declarations and structural elements
  if (
    trimmedContent.startsWith("function") ||
    trimmedContent === "{" ||
    trimmedContent === "}" ||
    trimmedContent.includes(") {") ||
    trimmedContent === ");"
  )
    return false;

  // Skip modifier keywords
  if (
    trimmedContent.includes("public") ||
    trimmedContent.includes("private") ||
    trimmedContent.includes("external") ||
    trimmedContent.includes("internal") ||
    trimmedContent.includes("view")
  )
    return false;

  // Standalone brackets
  if (trimmedContent === "(" || trimmedContent === ")") return false;

  // Skip else blocks
  if (trimmedContent === "} else {") return false;

  // Handle comments - don't skip single line comments
  if (
    trimmedContent.startsWith("/*") ||
    trimmedContent.startsWith("*") ||
    trimmedContent.startsWith("//")
  )
    return false;

  return true;
}

function calculateCoverage(functions: FunctionBlock[]): CoverageStats {
  // console.log("functions ----> \n");
  // functions.forEach((f) => {
  //   console.log("name:", f.name);
  //   console.log("Covered lines:", f.coveredLines);
  //   console.log("Untouched lines:",f.untouchedLines);
  //   console.log("Reverted Lines:", f.revertedLines);
  //   console.log("Is covered: ",f.isCovered);
  //   console.log("is reverted", f.isReverted);
  //   console.log("isTotallyCovered", f.isTotallyCovered);
  // });

  const totalFunctions = functions.length;
  const coveredFunctions = functions.filter((f) => f.isTotallyCovered).length;
  const coveredLines = functions.reduce((acc, f) => acc + f.coveredLines, 0);
  const revertedFunctions = functions.filter((f) => f.isReverted).length;
  const totalUntouchedLines = functions.reduce(
    (acc, f) => acc + f.untouchedLines,
    0
  );

  return {
    totalFunctions: totalFunctions,
    fullyCoveredFunctions: coveredFunctions,
    coveredLines: coveredLines,
    revertedLines: revertedFunctions,
    untouchedLines: totalUntouchedLines,
    coveragePercentage: Number(
      ((coveredFunctions / totalFunctions) * 100).toFixed(2)
    ),
  };
}

function processFileContent(fileContent: string): FileDataWithCoverage[] {
  const lines = fileContent.split("\n");
  const fileDataMap: { [key: string]: string[] } = {};
  let currentPath = "";

  // First, group lines by file
  lines.forEach((line) => {
    const pathMatch = line.match(/^\/.*\/.*$/);
    if (pathMatch) {
      currentPath = pathMatch[0];
      const pathParts = currentPath.split("/");
      currentPath = path.join(
        pathParts[pathParts.length - 2],
        pathParts[pathParts.length - 1]
      );
      fileDataMap[currentPath] = [];
    } else if (currentPath) {
      if (
        currentPath.includes("openzeppelin") ||
        currentPath.includes("forge") ||
        currentPath.includes(".t.sol") ||
        currentPath.includes(".s.sol") ||
        currentPath.includes("solady")
      ) {
        return;
      }
      fileDataMap[currentPath].push(line);
    }
  });

  return Object.keys(fileDataMap).map((filePath) => {
    const functionBlocks = parseFunctions(fileDataMap[filePath]);
    const lineData: LineData[] = functionBlocks.map((fb) => ({
      functionName: fb.name,
      touched: fb.isCovered,
      reverted: fb.isReverted,
      isFullyCovered: fb.isTotallyCovered,
    }));
    return {
      path: filePath,
      data: lineData,
      coverage: calculateCoverage(functionBlocks),
    };
  });
}

function readFileAndProcess(filePath: string): FileDataWithCoverage[] {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  return processFileContent(fileContent);
}

const main = () => {
  const options = parseArgs();

  if (options.verbose) {
    console.log('Running with options:');
    console.log(options);
  }

  const result = readFileAndProcess(options.filePath);

  result.forEach((data) => {
    console.log(`\nFile: ${data.path}`);

    if (options.outputFormat === 'json') {
      console.log(JSON.stringify(data.coverage, null, 2));
    } else {
      console.table(data.coverage);

      if (options.verbose) {
        const uncoveredFunctions = data.data.filter(d => !d.isFullyCovered);
        if (uncoveredFunctions.length > 0) {
          console.log("\nNot fully covered functions:");
          console.table(
            uncoveredFunctions.map(d => ({
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
