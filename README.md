## Pharos Season 2 Automation Bot
A powerful and configurable automation script for interacting with multiple protocols on the Pharos testnet. This bot is designed to automate daily tasks across several wallets, including token swaps, liquidity provision, NFT minting, and social tipping.

## Features
This script provides a comprehensive suite of automation tools for the Pharos ecosystem:

## 💧 AquaFlux Protocol Automation:
Daily login to AquaFlux with a wallet signature.
Claims daily free C and S tokens.
Crafts CS tokens from the claimed C and S tokens.
Interacts with the AquaFlux API to get a signature for NFT minting.
Mints the AquaFlux NFT using the crafted CS tokens.

## 🦄 DODO DEX Swaps:
Performs automated swap cycles between PHRS, USDT, and USDC.
Fetches optimal routing from the DODO API.
Handles token approvals automatically.

## 💰 Add Liquidity:
Adds liquidity to the specified USDC/USDT pool on the DODO exchange.
Allows the user to specify the amount of tokens to add.

## 💸 Primus Social Tipping:
Sends small, randomized tips in PHRS to a specified X (formerly Twitter) username.

## ⚙️ Multi-Wallet & Configuration:
Supports multiple wallets loaded from a .env file.

Interactive command-line interface (CLI) to configure tasks for each run.
Customizable random delays between transactions to simulate human behavior.
Robust error handling and retry mechanisms for API calls.

Prerequisites
Before you begin, ensure you have the following installed:

Node.js (v16 or later is recommended)

npm (usually comes with Node.js)

## 🚀 Setup & Installation
Clone the Repository
```bash
git clone https://github.com/kazmight/Pharos-S2-Bot.git
cd Pharos-S2-Bot
```
## Install Dependencies
Run the following command to install the required Node.js packages:
```bash
npm install
```
This will install ethers, axios, dotenv, and other necessary libraries.

## Create and Configure the .env File
Create a file named .env in the project's root directory. This file will securely store your wallet's private keys.
Add your private keys to the .env file, one per line, in the format below. You can add as many keys as you need.
```bash
PRIVATE_KEY_1=0xyour_private_key_here_1
PRIVATE_KEY_2=0xyour_private_key_here_2
PRIVATE_KEY_3=0xyour_private_key_here_3
```

## Create and Configure the twitter.txt File
Create a file named twitter.txt in the project's root directory.
Add username twitter to the twitter.txt file, you can add as many keys as you need.
Do not include the @ symbol. The bot adds it automatically.
Blank lines will be ignored.
Example twitter.txt content:
```bash
VitalikButerin
elonmusk
DappLabs
YourFavoriteUser
```

Security Note: Never share your .env file or commit it to a public repository.

## Usage
To run the bot, use the provided run_bot.sh script.

Make the Script Executable (only needs to be done once):
```bash
chmod +x run_bot.sh
```
## Run the Bot:
```bash
./run_bot.sh
```


The script will start and guide you through an interactive setup process where you can enable or disable specific tasks and configure parameters for the current session:
Enable/Disable Flows: You will be asked (y/n) to decide whether to run the AquaFlux, Swap, Add Liquidity, or Tipping flows.
Configure Amounts & Cycles: You can specify the number of swap cycles, the amount of liquidity to add, and the number of tips to send.
Set Delays: You can set a minimum and maximum delay (in seconds) that will be used to pause the script between transactions, helping to avoid rate limits and simulate human-like activity.
Once configured, the bot will process each wallet sequentially, performing the selected tasks. After completing all tasks for all wallets, it will display a countdown timer for the next 24-hour cycle.

## ⚠️ Security Warning
Private Key Risk: This script requires direct access to your wallet's private keys. This is inherently risky. Be aware that malicious code could potentially expose your keys. Always review the script's source code before running it.
Use Burner Wallets: It is strongly recommended to use "burner" wallets that are funded with only the minimum amount of testnet tokens required for transactions. DO NOT use this script with private keys that control valuable assets on any mainnet.

## Disclaimer
This script is provided for educational and experimental purposes only. The user assumes all risks associated with its use. The author is not responsible for any loss of funds or other damages that may occur.
