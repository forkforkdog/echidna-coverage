# Echidna Coverage Reporter

A TypeScript tool to parse and analyze Echidna code coverage reports for Solidity smart contracts.

## Features

- Parse Echidna coverage output files
- Generate coverage reports by contract and function
- Track covered, uncovered, and reverted functions
- Multiple output formats (table/JSON)
- Coverage threshold checks
- Detailed verbose reporting option

## Installation

```bash
git clone https://github.com/Simon-Busch/echidna-coverage
cd echidna-coverage
npm install
```
## Usage

Basic usage:
```bash
ts-node index.ts -f ./coverage.txt
```

With all options:

```bash
ts-node index.ts -v -f ./data/test.txt --format table -t 90 --contract TestContract.sol
```

## Options
- -v, --verbose: Show detailed output including uncovered functions
- -vv, --very-verbose: verbose mode + add logs of untouched lines and reverted lines
- -f, --file <path>: Path to coverage file (default: ./data/test.txt)
- --format <type>: Output format - 'table' or 'json' (default: table)
- -t, --threshold <n>: Coverage threshold percentage (default: 70)
- -h, --help: Show help message
- -c, --contract: filter by contract name matching

## Output Example

```bash
File: contracts/TestContract.sol
┌───────────────────────┬────────┐
│        (index)        │ Values │
├───────────────────────┼────────┤
│    totalFunctions     │   45   │
│ fullyCoveredFunctions │   31   │
│     coveredLines      │  297   │
│     revertedLines     │   0    │
│    untouchedLines     │   17   │
│  coveragePercentage   │ 68.89  │
└───────────────────────┴────────┘
```

## Note

- Test and scripts files are filtered out
- View function are trimmed out, as they are not relevant

## Contributing

1. Fork the repository
2. Create your feature branch
3. Submit a pull request

## License

MIT
