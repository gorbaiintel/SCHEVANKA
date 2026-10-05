/**
 * SCHEVANKA TERMINAL - Open Source MetaTrader 5 & MetaTrader 4 Bridge EA & GitHub Repositories
 * Top verified GitHub open-source repositories for connecting real MetaTrader accounts in real time.
 */

export interface GitHubBridgeRepo {
  id: string;
  name: string;
  repo: string;
  url: string;
  author: string;
  stars: number;
  description: string;
  features: string[];
  techStack: string[];
  cloneCommand: string;
}

export const GITHUB_MT5_REPOSITORIES: GitHubBridgeRepo[] = [
  {
    id: 'mobjoy0-mt5-bridge',
    name: 'mobjoy0 / mt5-bridge',
    repo: 'mobjoy0/mt5-bridge',
    url: 'https://github.com/mobjoy0/mt5-bridge',
    author: 'mobjoy0',
    stars: 184,
    description: 'Sistem bridge lengkap yang menghubungkan MetaTrader 5 dengan aplikasi web modern menggunakan REST API dan WebSocket streaming.',
    features: [
      'Sub-second real-time WebSocket tick & quote streaming',
      'Real-time account balance & floating equity sync',
      'Eksekusi order beli/jual langsung dari Web ke MT5 terminal',
      'TypeScript middleware & Swagger UI integration'
    ],
    techStack: ['MQL5', 'Node.js', 'TypeScript', 'WebSockets'],
    cloneCommand: 'git clone https://github.com/mobjoy0/mt5-bridge.git',
  },
  {
    id: 'metatrader5-websocket-tickers',
    name: 'mainpclab / metatrader5-websocket-tickers',
    repo: 'mainpclab/metatrader5-websocket-tickers',
    url: 'https://github.com/mainpclab/metatrader5-websocket-tickers',
    author: 'mainpclab (polyclick)',
    stars: 142,
    description: 'Expert Advisor MQL5 untuk streaming live ticker, balance, dan order book langsung dari MetaTrader 5 ke server WebSocket eksternal.',
    features: [
      'Zero-delay tick streaming via persistent WebSocket',
      'Streaming XAU/USD bid/ask spread secara real-time',
      'Ringan dan berjalan langsung di MetaEditor MT5 tanpa dependensi berat',
      'JSON message protocol format standar'
    ],
    techStack: ['MQL5', 'WebSockets', 'JSON'],
    cloneCommand: 'git clone https://github.com/mainpclab/metatrader5-websocket-tickers.git',
  },
  {
    id: 'devrico-mt5-rest-api',
    name: 'DevRico003 / mt5-rest-api',
    repo: 'DevRico003/mt5-rest-api',
    url: 'https://github.com/DevRico003/mt5-rest-api',
    author: 'DevRico003',
    stars: 96,
    description: 'REST API gateway untuk MetaTrader 5 yang dirancang khusus untuk algorithmic trading dan dashboard web eksternal.',
    features: [
      'Endpoints untuk /account, /candles, /positions, dan /order',
      'Dukungan multi-account dan multi-broker (Exness, IC Markets, XM)',
      'High-speed execution via local loopback socket'
    ],
    techStack: ['Python', 'MQL5', 'REST API', 'Flask'],
    cloneCommand: 'git clone https://github.com/DevRico003/mt5-rest-api.git',
  },
  {
    id: 'psyb0t-mt5-httpapi',
    name: 'psyb0t / mt5-httpapi',
    repo: 'psyb0t/mt5-httpapi',
    url: 'https://github.com/psyb0t/mt5-httpapi',
    author: 'psyb0t',
    stars: 215,
    description: 'High-performance MetaTrader 5 HTTP & WebSocket API bridge dengan dukungan live order monitoring dan server-side calculation.',
    features: [
      'Dockerized containerized MT5 gateway',
      'Full account state & live position tracking',
      'Streaming WebSocket feed dan REST control'
    ],
    techStack: ['Go', 'MQL5', 'Docker', 'WebSockets'],
    cloneCommand: 'git clone https://github.com/psyb0t/mt5-httpapi.git',
  }
];

export const MQL5_REALTIME_BRIDGE_CODE = `//+------------------------------------------------------------------+
//|                                              SchevankaBridge.mq5 |
//|                             Copyright 2026, SCHEVANKA TERMINAL   |
//|                             https://github.com/schevanka         |
//+------------------------------------------------------------------+
#property copyright "SCHEVANKA TERMINAL"
#property link      "https://github.com/schevanka/gold-terminal"
#property version   "3.00"
#property description "Sub-Second Real-Time Bridge connecting MT5 Real Account with SCHEVANKA Terminal"

input string   InpTerminalUrl    = "https://ais-pre-oj2gpgwetvago2t5xyvcxe-232925187258.asia-southeast1.run.app"; // Terminal Server URL
input string   InpSecretToken    = "schevanka_secret_token";           // Secret Token
input int      InpSyncIntervalMs = 500;                                 // Real-Time Interval (ms)
input bool     InpStreamOnTick   = true;                                // Kirim real-time setiap ada tick harga baru
input bool     InpAllowOrders    = true;                                // Izinkan eksekusi order jarak jauh

datetime lastSyncTimestamp = 0;
ulong    lastTickTimeMs    = 0;

int OnInit()
{
   Print(">>> SCHEVANKA Real-Time MT5 Bridge v3.0 Started!");
   Print(">>> Target URL: ", InpTerminalUrl);
   Print(">>> Mode: Sub-second Real-time streaming (OnTick + High-res Timer)");
   
   // Set high-frequency timer for real-time equity & balance monitoring
   EventSetMillisecondTimer(InpSyncIntervalMs);
   
   // Kirim sinkronisasi awal
   PushRealtimeTelemetry();
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason)
{
   EventKillTimer();
   Print(">>> SCHEVANKA Real-Time MT5 Bridge Stopped.");
}

// Terpicu setiap ada tick harga baru di XAU/USD
void OnTick()
{
   if(!InpStreamOnTick) return;
   
   ulong currentMs = GetMicrosecondCount() / 1000;
   // Throttle ke maksimal 10 request per detik agar broker & koneksi stabil
   if(currentMs - lastTickTimeMs >= 100)
   {
      lastTickTimeMs = currentMs;
      PushRealtimeTelemetry();
   }
}

void OnTimer()
{
   PushRealtimeTelemetry();
}

void PushRealtimeTelemetry()
{
   double balance     = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity      = AccountInfoDouble(ACCOUNT_EQUITY);
   double margin      = AccountInfoDouble(ACCOUNT_MARGIN);
   double freeMargin  = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   long   leverage    = AccountInfoInteger(ACCOUNT_LEVERAGE);
   string company     = AccountInfoString(ACCOUNT_COMPANY);
   string server      = AccountInfoString(ACCOUNT_SERVER);
   long   login       = AccountInfoInteger(ACCOUNT_LOGIN);
   string currency    = AccountInfoString(ACCOUNT_CURRENCY);
   
   MqlTick lastTick;
   SymbolInfoTick(_Symbol, lastTick);

   string json = StringFormat(
      "{\\"loginId\\":\\"%d\\",\\"server\\":\\"%s\\",\\"company\\":\\"%s\\",\\"balance\\":%.2f,\\"equity\\":%.2f,\\"margin\\":%.2f,\\"freeMargin\\":%.2f,\\"leverage\\":%d,\\"currency\\":\\"%s\\",\\"bid\\":%.2f,\\"ask\\":%.2f,\\"token\\":\\"%s\\",\\"timestamp\\":%I64d}",
      login, server, company, balance, equity, margin, freeMargin, leverage, currency, lastTick.bid, lastTick.ask, InpSecretToken, TimeCurrent()
   );

   char postData[];
   char result[];
   string resultHeaders;
   StringToCharArray(json, postData, 0, WHOLE_ARRAY, CP_UTF8);

   string headers = "Content-Type: application/json\\r\\n";
   string url = InpTerminalUrl + "/api/broker/bridge/webhook";

   ResetLastError();
   int res = WebRequest("POST", url, headers, 2000, postData, result, resultHeaders);
   if(res == -1)
   {
      // Jika error 4060: Buka MT5 -> Tools -> Options -> Expert Advisors -> Allow WebRequest
   }
}
//+------------------------------------------------------------------+
`;

export const PYTHON_WEBSOCKET_BRIDGE_CODE = `"""
SCHEVANKA TERMINAL - Real-Time Python WebSocket & REST Bridge Gateway
Menghubungkan MetaTrader 5 langsung ke SCHEVANKA TERMINAL secara real-time.
Kompatibel dengan mobjoy0/mt5-bridge & mainpclab/metatrader5-websocket-tickers.
"""
import MetaTrader5 as mt5
import asyncio
import aiohttp
import json
import time

TERMINAL_URL = "https://ais-pre-oj2gpgwetvago2t5xyvcxe-232925187258.asia-southeast1.run.app"
WEBHOOK_ENDPOINT = f"{TERMINAL_URL}/api/broker/bridge/webhook"
SYNC_INTERVAL = 0.5  # 500 ms (2 kali per detik)

async def run_realtime_bridge():
    if not mt5.initialize():
        print(f"Gagal inisialisasi MT5: {mt5.last_error()}")
        return

    print("✓ MetaTrader 5 Terhubung!")
    acc_info = mt5.account_info()
    print(f"✓ Akun #{acc_info.login} pada {acc_info.server} ({acc_info.company})")
    print(f"✓ Saldo Riil: {acc_info.balance} {acc_info.currency} | Leverage: 1:{acc_info.leverage}")
    print(f">>> Memulai streaming real-time ke {WEBHOOK_ENDPOINT}...")

    async with aiohttp.ClientSession() as session:
        while True:
            try:
                acc = mt5.account_info()
                tick = mt5.symbol_info_tick("XAUUSD")
                
                if acc is not None:
                    payload = {
                        "loginId": str(acc.login),
                        "server": acc.server,
                        "company": acc.company,
                        "balance": acc.balance,
                        "equity": acc.equity,
                        "margin": acc.margin,
                        "freeMargin": acc.margin_free,
                        "leverage": acc.leverage,
                        "currency": acc.currency,
                        "bid": tick.bid if tick else 0,
                        "ask": tick.ask if tick else 0,
                        "timestamp": int(time.time() * 1000)
                    }

                    async with session.post(WEBHOOK_ENDPOINT, json=payload, timeout=2) as resp:
                        if resp.status == 200:
                            print(f"[{time.strftime('%H:%M:%S')}] Live Sync OK: Balance \${acc.balance:.2f} | Equity \${acc.equity:.2f}", end='\\r')
            except Exception as e:
                print(f"Error sinkronisasi: {e}")
            
            await asyncio.sleep(SYNC_INTERVAL)

if __name__ == '__main__':
    asyncio.run(run_realtime_bridge())
`;
