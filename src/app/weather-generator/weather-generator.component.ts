import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseAccountService } from '../services/base-account.service';
import { TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';

/**
 * WeatherGeneratorComponent
 *
 * This Angular component fetches live weather data for a user-specified city,
 * generates a dynamic NFT containing the forecast metadata,
 * and mints it on-chain using a Base sub-account with auto-spend permissions.
 *
 * The process happens without wallet pop-ups, leveraging the Base Account SDK.
 */
@Component({
    selector: 'app-weather-generator',
    templateUrl: './weather-generator.component.html',
    styleUrls: ['./weather-generator.component.scss'],
    standalone: true,
    imports: [TitleCasePipe, FormsModule],
})
export class WeatherGeneratorComponent {

    private readonly _http: HttpClient = inject(HttpClient);

    private readonly _baseAccount: BaseAccountService = inject(BaseAccountService);


    city = '';
    weather: any;
    loading = false;
    txHash: string | null = null;
    error: any;

    private readonly CONTRACT_ADDRESS = '0xb4F800E5647f9B82Be98068cb98c516f871bb7B8';
    private readonly API_KEY = environment.openWeatherApiKey;

    async ngOnInit() {
        await this._baseAccount.connectWallet();
    }

    /**
     * Fetches the current weather for the selected city,
     * generates metadata for the NFT, encodes it to Base64,
     * and mints it using the Base sub-account (no wallet pop-ups).
     *
     * Steps:
     * 1. Calls OpenWeatherMap API for live weather.
     * 2. Builds NFT metadata JSON (name, description, attributes).
     * 3. Encodes metadata as base64 data URI.
     * 4. Calls the `mintNFT(address,string)` function on the contract via sub-account.
     *
     * @returns {Promise<void>} Resolves after the transaction is sent.
     */
    async getWeather(): Promise<void> {
        this.loading = true;
        this.txHash = null;
        this.weather = null;

        try {
            const cityName = this.city.trim() || 'Washington';
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${this.API_KEY}&units=metric`;

            // Fetch real weather data from OpenWeatherMap
            this.weather = await this._http.get(url).toPromise();

            // Construct NFT metadata
            const metadata = {
                name: `Weather in ${this.weather.name}`,
                description: `Forecast for ${this.weather.name}: ${this.weather.weather[0].description}, ${this.weather.main.temp}°C`,
                attributes: [
                    { trait_type: 'City', value: this.weather.name },
                    { trait_type: 'Temperature', value: `${this.weather.main.temp}°C` },
                    { trait_type: 'Condition', value: this.weather.weather[0].description },
                    { trait_type: 'Date', value: new Date().toLocaleString() }
                ]
            };

            // Encode JSON metadata to Base64 URI format
            const jsonStr = JSON.stringify(metadata);
            const b64 = btoa(
                encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) =>
                    String.fromCharCode(parseInt(p1, 16))
                )
            );
            const tokenURI = `data:application/json;base64,${b64}`;

            // Retrieve sub-account address from Base Account SDK
            const subAddress = await this._baseAccount.getSubAccountAddress();

            // Encode call data for mintNFT(address,string)
            const mintFunction = {
                to: this.CONTRACT_ADDRESS,
                data: this.encodeMintCall(subAddress, tokenURI),
                value: '0x0'
            };

            // Send transaction from sub-account (auto-spend, no pop-ups)
            const result = await this._baseAccount.sendTransactionFromSub(
                mintFunction.to,
                mintFunction.data
            );

            this.txHash = result?.txHash || result?.hash || null;
        } catch (err: any) {
            this.error = err["message"];
            console.error('❌ Error minting NFT:', err);
        } finally {
            this.loading = false;
        }
    }

    /**
     * Encodes a call to the Solidity function `mintNFT(address,string)` manually,
     * without relying on ethers.js or keccak256 utilities.
     *
     * Function selector: `0x40c10f19`
     * (keccak256("mintNFT(address,string)")[:4])
     *
     * @param {string} to - The recipient address for the NFT.
     * @param {string} tokenURI - The metadata URI encoded as a data URI.
     * @returns {string} ABI-encoded transaction data for the mint call.
     */
    encodeMintCall(to: string, tokenURI: string): string {
        const selector = '0x40c10f19'; // function selector for mintNFT(address,string)
        const toPadded = to.replace('0x', '').padStart(64, '0');
        const tokenURIHex = Array.from(tokenURI)
            .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
            .join('');
        const lengthHex = tokenURIHex.length / 2;
        const lenPadded = lengthHex.toString(16).padStart(64, '0');
        const offset = '0000000000000000000000000000000000000000000000000000000000000040';

        return selector + toPadded + offset + lenPadded + tokenURIHex.padEnd(Math.ceil(tokenURIHex.length / 64) * 64, '0');
    }

    /**
     * Generates a link to view the transaction on BaseScan (Base Sepolia by default).
     *
     * @returns {string} A URL to the transaction details page on BaseScan.
     */
    getBaseScanLink(): string {
        return this.txHash ? `https://sepolia.basescan.org/tx/${this.txHash}` : '';
    }
}
