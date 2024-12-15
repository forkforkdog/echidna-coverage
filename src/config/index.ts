import { ProgramOptions } from "../types/types";

export const DEFAULT_CONFIG: ProgramOptions = {
  verbose: false,
  veryVerbose: false,
  filePath: "./data/test.txt",
  outputFormat: "table",
  threshold: 0,
  help: false,
  contract: undefined,
};
