import { ProgramOptions } from "../types/types";

export const DEFAULT_CONFIG: ProgramOptions = {
  verbose: false,
  veryVerbose: false,
  filePath: undefined,
  outputFormat: "table",
  threshold: 70,
  help: false,
  contract: undefined,
  echidnaFolder: ".",
  condensedMode: false,
  allFunctions: false,
  scopeFile: undefined,
  sourceOnly: false,
  logical: false,
  exclude: undefined,
};
