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
ts-node index.ts -v -f ./data/test.txt --format table -t 90
```

## Options
- -v, --verbose: Show detailed output including uncovered functions
- -f, --file <path>: Path to coverage file (default: ./data/test.txt)
- --format <type>: Output format - 'table' or 'json' (default: table)
- -t, --threshold <n>: Coverage threshold percentage (default: 0)
- -h, --help: Show help message

## Output Example

```bash
File: contracts/Mock3PL.sol
┌─────────────┬───────┐
│   (index)   │ Value │
├─────────────┼───────┤
│ totalLines  │  15   │
│ coveredLines│  12   │
│ revertedLines│  1   │
│ coverage    │  80%  │
└─────────────┴───────┘
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Submit a pull request

## License

MIT
