# 🌤️ Weather NFT Generator

**An onchain weather app using Base Account SDK (Sub Accounts + Auto Spend Permissions)**  
Built by **Lev Alefirenko**

---

## 🧠 Overview

Weather NFT Generator is a simple onchain app where users can enter a city name and mint an NFT that shows the **real-time weather forecast** for that city — **without wallet pop-ups**.  
It integrates the **Base Account SDK** to create **Sub Accounts** with **Auto Spend Permissions**, enabling seamless transactions without user confirmations.

---

## 🪶 Features

- 🌍 Real weather data (via OpenWeatherMap API)
- 🧠 Sub Accounts + Auto Spend Permissions (no wallet pop-ups)
- 🪙 NFT minted directly on **Base Sepolia**
- 🧩 Clean Angular frontend + Solidity backend
- 📅 NFT attributes include **temperature, date, and time**

---

## 🧰 Tech Stack

| Layer          | Tech                 |
| -------------- | -------------------- |
| Frontend       | Angular + TypeScript |
| Smart Contract | Solidity + Hardhat   |
| Blockchain     | Base Sepolia         |
| SDK            | Base Account SDK     |
| Weather API    | OpenWeatherMap       |

## 🧩 How It Works

1. User enters a city name (default = Washington).

2. The app fetches live weather data from the OpenWeatherMap API.

3. It encodes the weather info (description, temperature, date, and time) into an NFT metadata JSON.

4. The Sub Account (auto-spend enabled) calls mintNFT() onchain automatically — no pop-ups, no MetaMask confirmation.

5. The user receives a Weather NFT on Base Sepolia.
