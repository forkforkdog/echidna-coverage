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
yarn start -vv -f ./data/test.txt --format table -t 90 --contract /TestContract.sol
```

## Options
- -v, --verbose: Show detailed output including uncovered functions
- -vv, --very-verbose: verbose mode + add logs of untouched lines and reverted lines
- -f, --file `<path>`: Path to coverage file.txt (default: ./data/test.txt)
- -ef, --echidna-folder `<path>`: path to the root of your directory containing the `echidna` folder
- --format `<type>`: Output format - 'table' or 'json' (default: table)
- -t, --threshold `<n>`: Coverage threshold percentage (default: 70)
- -h, --help: Show help message
- -c, --contract: filter by contract name matching

## Output Example

### Using normal mode

```bash
══════════════════════════════════════════════════
📄 File: mock/TestContract.sol
══════════════════════════════════════════════════

┌───────────────────────┬────────┐
│        (index)        │ Values │
├───────────────────────┼────────┤
│    totalFunctions     │   6    │
│ fullyCoveredFunctions │   5    │
│     coveredLines      │   16   │
│     revertedLines     │   1    │
│    untouchedLines     │   1    │
│  coveragePercentage   │ 83.33  │
└───────────────────────┴────────┘
```

### Using normal verbose mode (-v)

```bash
══════════════════════════════════════════════════
📄 File: mock/TestContract.sol
══════════════════════════════════════════════════
┌───────────────────────┬────────┐
│        (index)        │ Values │
├───────────────────────┼────────┤
│    totalFunctions     │   6    │
│ fullyCoveredFunctions │   5    │
│     coveredLines      │   16   │
│     revertedLines     │   1    │
│    untouchedLines     │   1    │
│  coveragePercentage   │ 83.33  │
└───────────────────────┴────────┘

⚠️ Not fully covered functions:
┌─────────┬───────────────────────┬─────────┬──────────┬────────────────┐
│ (index) │     functionName      │ touched │ reverted │ untouchedLines │
├─────────┼───────────────────────┼─────────┼──────────┼────────────────┤
│    0    │ 'makePaymentMoreArgs' │  true   │   true   │       1        │
└─────────┴───────────────────────┴─────────┴──────────┴────────────────┘
══════════════════════════════════════════════════
```

### Using normal very-verbose mode (-vv)

```bash
══════════════════════════════════════════════════
📄 File: mock/TestContract.sol
══════════════════════════════════════════════════
┌───────────────────────┬────────┐
│        (index)        │ Values │
├───────────────────────┼────────┤
│    totalFunctions     │   6    │
│ fullyCoveredFunctions │   5    │
│     coveredLines      │   16   │
│     revertedLines     │   1    │
│    untouchedLines     │   1    │
│  coveragePercentage   │ 83.33  │
└───────────────────────┴────────┘

⚠️ Not fully covered functions:
┌─────────┬───────────────────────┬─────────┬──────────┬────────────────┐
│ (index) │     functionName      │ touched │ reverted │ untouchedLines │
├─────────┼───────────────────────┼─────────┼──────────┼────────────────┤
│    0    │ 'makePaymentMoreArgs' │  true   │   true   │       1        │
└─────────┴───────────────────────┴─────────┴──────────┴────────────────┘

Function: makePaymentMoreArgs
❌ Untouched lines:
debt -= amount;

⚠️ Reverted lines:
IERC20(_token).transferFrom(msg.sender, address(this), amount);
══════════════════════════════════════════════════
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
