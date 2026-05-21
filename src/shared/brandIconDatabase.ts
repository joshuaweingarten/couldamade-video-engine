export type BrandIcon = {
  title: string;
  viewBox: string;
  body: string;
  hex?: string;
};

export type BrandLogo = {
  title: string;
  domain?: string;
  color: string;
  icon?: BrandIcon;
};

const LOCAL_BRAND_ICONS: Record<string, BrandIcon> = {
  AAPL: {
    title: "Apple",
    viewBox: "0 0 24 24",
    hex: "a8b0b8",
    body: '<path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>'
  },
  BTC: {
    title: "Bitcoin",
    viewBox: "0 0 24 24",
    hex: "f7931a",
    body: '<path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.33-.525 2.107c-.345-.087-.705-.167-1.064-.25l.526-2.127-1.32-.33-.54 2.165c-.285-.067-.565-.132-.84-.2l-1.815-.45-.35 1.407s.975.225.955.236c.535.136.63.486.615.766l-1.477 5.92c-.075.166-.24.406-.614.314.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.242-.54 2.19 1.32.327.54-2.17c.36.1.705.19 1.05.273l-.51 2.154 1.32.33.545-2.19c2.24.427 3.93.257 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.193 1.5-.76 1.68-1.93zm-3.01 4.22c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.524 2.75 2.084z"/>'
  },
  ETH: {
    title: "Ethereum",
    viewBox: "0 0 24 24",
    hex: "3c3c3d",
    body: '<path d="M11.944 17.97 4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0 4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/>'
  },
  META: {
    title: "Meta",
    viewBox: "0 0 24 24",
    hex: "0866ff",
    body: '<path d="M22.25 7.535c-.905-1.336-2.142-2.044-3.576-2.044-1.147 0-2.033.379-2.745.943-.743.588-1.331 1.395-1.88 2.252l-.77 1.21-.713-1.097c-.69-1.057-1.31-1.821-1.921-2.31-.7-.56-1.53-.848-2.557-.848-1.47 0-2.717.704-3.612 2.031C3.51 9.103 3 11.13 3 13.56c0 1.49.315 2.688.917 3.503.622.843 1.494 1.278 2.54 1.278.863 0 1.565-.25 2.15-.773.544-.486 1.002-1.188 1.49-2.07l.86-1.55.474-.85.353.55.635.995c.69 1.078 1.332 1.871 1.98 2.4.72.586 1.548.89 2.555.89 1.003 0 1.85-.36 2.507-1.06.71-.757 1.168-1.895 1.37-3.367.35-2.55-.12-4.636-1.58-5.97zm-15.75 8.43c-.488 0-.826-.2-1.065-.61-.29-.5-.435-1.246-.435-2.235 0-1.79.34-3.255.956-4.225.525-.826 1.188-1.24 1.95-1.24.512 0 .94.152 1.344.478.46.372.94.975 1.525 1.9l.802 1.272-1.113 1.78c-.502.804-.885 1.375-1.18 1.72-.356.415-.717.625-1.084.625zm12.04-1.02c-.328.665-.798.998-1.41.998-.493 0-.94-.168-1.36-.51-.495-.404-1.01-1.044-1.606-1.99l-.51-.81 1.04-1.638c.61-.96 1.13-1.63 1.6-2.016.43-.353.86-.52 1.337-.52.76 0 1.39.39 1.88 1.17.57.91.86 2.176.86 3.8 0 .95-.124 1.71-.37 2.21z"/>'
  },
  MSFT: {
    title: "Microsoft",
    viewBox: "0 0 24 24",
    hex: "7fba00",
    body: '<path d="M1 1h10v10H1zM13 1h10v10H13zM1 13h10v10H1zM13 13h10v10H13z"/>'
  },
  NVDA: {
    title: "NVIDIA",
    viewBox: "0 0 24 24",
    hex: "76b900",
    body: '<path d="M12.01 5.51c-3.78 0-7.02 2.31-8.36 5.59 1.34 3.28 4.58 5.59 8.36 5.59s7.02-2.31 8.36-5.59c-1.34-3.28-4.58-5.59-8.36-5.59zm0 10.1a4.51 4.51 0 1 1 0-9.02 4.51 4.51 0 0 1 0 9.02zm0-7.2a2.69 2.69 0 1 0 0 5.38 2.69 2.69 0 0 0 0-5.38z"/>'
  },
  TSLA: {
    title: "Tesla",
    viewBox: "0 0 24 24",
    hex: "cc0000",
    body: '<path d="M12 5.362l2.475-3.026s4.245.09 8.471 2.054c-1.082 1.636-3.231 2.438-3.231 2.438-.146-1.439-1.154-1.79-4.354-1.79L12 24 8.619 5.034c-3.18 0-4.188.354-4.335 1.792 0 0-2.146-.795-3.229-2.43C5.28 2.431 9.525 2.34 9.525 2.34L12 5.362l-.004.002H12v-.002zm0-3.899c3.415-.03 7.326.528 11.328 2.28.535-.968.672-1.395.672-1.395C19.625.612 15.528.015 12 0 8.472.015 4.375.61 0 2.349c0 0 .195.525.672 1.396C4.674 1.989 8.585 1.435 12 1.46v.003z"/>'
  }
};

export const BRAND_LOGO_DATABASE: Record<string, BrandLogo> = {
  AAPL: { title: "Apple", domain: "apple.com", color: "#a8b0b8", icon: LOCAL_BRAND_ICONS.AAPL },
  MSFT: { title: "Microsoft", domain: "microsoft.com", color: "#7fba00", icon: LOCAL_BRAND_ICONS.MSFT },
  GOOGL: { title: "Google", domain: "google.com", color: "#4285f4" },
  GOOG: { title: "Google", domain: "google.com", color: "#4285f4" },
  AMZN: { title: "Amazon", domain: "amazon.com", color: "#ff9900" },
  NVDA: { title: "NVIDIA", domain: "nvidia.com", color: "#76b900", icon: LOCAL_BRAND_ICONS.NVDA },
  META: { title: "Meta", domain: "meta.com", color: "#0866ff", icon: LOCAL_BRAND_ICONS.META },
  TSLA: { title: "Tesla", domain: "tesla.com", color: "#e82127", icon: LOCAL_BRAND_ICONS.TSLA },
  BTC: { title: "Bitcoin", color: "#f7931a", icon: LOCAL_BRAND_ICONS.BTC },
  ETH: { title: "Ethereum", color: "#3c3c3d", icon: LOCAL_BRAND_ICONS.ETH },
  AVGO: { title: "Broadcom", domain: "broadcom.com", color: "#cc092f" },
  JPM: { title: "JPMorgan Chase", domain: "jpmorganchase.com", color: "#005eb8" },
  V: { title: "Visa", domain: "visa.com", color: "#1434cb" },
  MA: { title: "Mastercard", domain: "mastercard.com", color: "#eb001b" },
  WMT: { title: "Walmart", domain: "walmart.com", color: "#0071ce" },
  LLY: { title: "Eli Lilly", domain: "lilly.com", color: "#d52b1e" },
  ORCL: { title: "Oracle", domain: "oracle.com", color: "#c74634" },
  NFLX: { title: "Netflix", domain: "netflix.com", color: "#e50914" },
  XOM: { title: "ExxonMobil", domain: "exxonmobil.com", color: "#fe000c" },
  COST: { title: "Costco", domain: "costco.com", color: "#005dab" },
  HD: { title: "The Home Depot", domain: "homedepot.com", color: "#f96302" },
  PG: { title: "Procter & Gamble", domain: "pg.com", color: "#003da5" },
  JNJ: { title: "Johnson & Johnson", domain: "jnj.com", color: "#d71920" },
  BAC: { title: "Bank of America", domain: "bankofamerica.com", color: "#012169" },
  ABBV: { title: "AbbVie", domain: "abbvie.com", color: "#071d49" },
  KO: { title: "Coca-Cola", domain: "coca-cola.com", color: "#d00013" },
  PLTR: { title: "Palantir", domain: "palantir.com", color: "#111111" },
  CRM: { title: "Salesforce", domain: "salesforce.com", color: "#00a1e0" },
  SAP: { title: "SAP", domain: "sap.com", color: "#0faaff" },
  TMUS: { title: "T-Mobile", domain: "t-mobile.com", color: "#e20074" },
  ASML: { title: "ASML", domain: "asml.com", color: "#001e82" },
  CSCO: { title: "Cisco", domain: "cisco.com", color: "#1ba0d7" },
  AMD: { title: "AMD", domain: "amd.com", color: "#ed1c24" },
  MCD: { title: "McDonald's", domain: "mcdonalds.com", color: "#ffbc0d" },
  IBM: { title: "IBM", domain: "ibm.com", color: "#052fad" },
  DIS: { title: "Disney", domain: "disney.com", color: "#113ccf" },
  ADBE: { title: "Adobe", domain: "adobe.com", color: "#ff0000" },
  SHOP: { title: "Shopify", domain: "shopify.com", color: "#7ab55c" },
  UBER: { title: "Uber", domain: "uber.com", color: "#111111" },
  ABNB: { title: "Airbnb", domain: "airbnb.com", color: "#ff5a5f" },
  PYPL: { title: "PayPal", domain: "paypal.com", color: "#003087" },
  INTC: { title: "Intel", domain: "intel.com", color: "#0071c5" },
  QCOM: { title: "Qualcomm", domain: "qualcomm.com", color: "#3253dc" },
  TXN: { title: "Texas Instruments", domain: "ti.com", color: "#cc0000" },
  NOW: { title: "ServiceNow", domain: "servicenow.com", color: "#62d84e" },
  SONY: { title: "Sony", domain: "sony.com", color: "#111111" },
  SBUX: { title: "Starbucks", domain: "starbucks.com", color: "#006241" },
  NKE: { title: "Nike", domain: "nike.com", color: "#111111" },
  TGT: { title: "Target", domain: "target.com", color: "#cc0000" },
  PEP: { title: "Pepsi", domain: "pepsi.com", color: "#2151a1" },
  BA: { title: "Boeing", domain: "boeing.com", color: "#1b75bb" },
  F: { title: "Ford", domain: "ford.com", color: "#003478" },
  GM: { title: "General Motors", domain: "gm.com", color: "#0170ce" },
  GE: { title: "General Electric", domain: "ge.com", color: "#0870d8" },
  CAT: { title: "Caterpillar", domain: "cat.com", color: "#ffcd11" },
  UPS: { title: "UPS", domain: "ups.com", color: "#351c15" },
  FDX: { title: "FedEx", domain: "fedex.com", color: "#4d148c" },
  LOW: { title: "Lowe's", domain: "lowes.com", color: "#004990" },
  CVS: { title: "CVS Health", domain: "cvshealth.com", color: "#cc0000" },
  T: { title: "AT&T", domain: "att.com", color: "#009fdb" },
  VZ: { title: "Verizon", domain: "verizon.com", color: "#cd040b" },
  CMCSA: { title: "Comcast", domain: "comcast.com", color: "#111111" },
  SPOT: { title: "Spotify", domain: "spotify.com", color: "#1db954" },
  SQ: { title: "Block", domain: "block.xyz", color: "#111111" },
  SNAP: { title: "Snapchat", domain: "snap.com", color: "#fffc00" },
  PINS: { title: "Pinterest", domain: "pinterest.com", color: "#bd081c" },
  RDDT: { title: "Reddit", domain: "reddit.com", color: "#ff4500" },
  RBLX: { title: "Roblox", domain: "roblox.com", color: "#111111" },
  EA: { title: "Electronic Arts", domain: "ea.com", color: "#ff4747" },
  BKNG: { title: "Booking Holdings", domain: "booking.com", color: "#003b95" },
  MAR: { title: "Marriott", domain: "marriott.com", color: "#b4975a" },
  HLT: { title: "Hilton", domain: "hilton.com", color: "#104c97" },
  DAL: { title: "Delta Air Lines", domain: "delta.com", color: "#c8102e" },
  UAL: { title: "United Airlines", domain: "united.com", color: "#005daa" },
  AAL: { title: "American Airlines", domain: "aa.com", color: "#0078d2" },
  LUV: { title: "Southwest Airlines", domain: "southwest.com", color: "#304cb2" },
  HSBC: { title: "HSBC", domain: "hsbc.com", color: "#db0011" },
  AXP: { title: "American Express", domain: "americanexpress.com", color: "#2e77bc" },
  GS: { title: "Goldman Sachs", domain: "goldmansachs.com", color: "#7399c6" },
  MS: { title: "Morgan Stanley", domain: "morganstanley.com", color: "#0077b5" },
  BLK: { title: "BlackRock", domain: "blackrock.com", color: "#111111" },
  SCHW: { title: "Charles Schwab", domain: "schwab.com", color: "#0073cf" },
  HOOD: { title: "Robinhood", domain: "robinhood.com", color: "#00c805" },
  COIN: { title: "Coinbase", domain: "coinbase.com", color: "#0052ff" },
  MELI: { title: "MercadoLibre", domain: "mercadolibre.com", color: "#ffe600" },
  BABA: { title: "Alibaba", domain: "alibaba.com", color: "#ff6a00" },
  BIDU: { title: "Baidu", domain: "baidu.com", color: "#2932e1" },
  JD: { title: "JD.com", domain: "jd.com", color: "#e1251b" },
  NIO: { title: "NIO", domain: "nio.com", color: "#111111" },
  TM: { title: "Toyota", domain: "toyota.com", color: "#eb0a1e" },
  HMC: { title: "Honda", domain: "honda.com", color: "#cc0000" },
  RACE: { title: "Ferrari", domain: "ferrari.com", color: "#d40000" },
  RIVN: { title: "Rivian", domain: "rivian.com", color: "#111111" },
  LCID: { title: "Lucid", domain: "lucidmotors.com", color: "#b8916a" },
  BMWYY: { title: "BMW", domain: "bmw.com", color: "#0066b1" },
  VWAGY: { title: "Volkswagen", domain: "volkswagen.com", color: "#001e50" },
  DE: { title: "John Deere", domain: "deere.com", color: "#367c2b" },
  LMT: { title: "Lockheed Martin", domain: "lockheedmartin.com", color: "#005eb8" },
  RTX: { title: "RTX", domain: "rtx.com", color: "#111111" },
  HON: { title: "Honeywell", domain: "honeywell.com", color: "#ee3124" },
  MMM: { title: "3M", domain: "3m.com", color: "#ff1a1a" },
  SHEL: { title: "Shell", domain: "shell.com", color: "#ffd500" },
  BP: { title: "BP", domain: "bp.com", color: "#009a44" },
  CVX: { title: "Chevron", domain: "chevron.com", color: "#0033a0" },
  TMO: { title: "Thermo Fisher Scientific", domain: "thermofisher.com", color: "#e7131a" },
  PFE: { title: "Pfizer", domain: "pfizer.com", color: "#0093d0" },
  MRK: { title: "Merck", domain: "merck.com", color: "#007a73" },
  NVO: { title: "Novo Nordisk", domain: "novonordisk.com", color: "#001965" },
  GSK: { title: "GSK", domain: "gsk.com", color: "#f36633" },
  AMGN: { title: "Amgen", domain: "amgen.com", color: "#005eb8" },
  GILD: { title: "Gilead Sciences", domain: "gilead.com", color: "#bd1d2c" },
  MDT: { title: "Medtronic", domain: "medtronic.com", color: "#004b8d" },
  EL: { title: "Estee Lauder", domain: "esteelauder.com", color: "#040a2b" },
  KDP: { title: "Keurig Dr Pepper", domain: "keurigdrpepper.com", color: "#d71920" },
  MDLZ: { title: "Mondelez", domain: "mondelezinternational.com", color: "#4f2170" },
  CMG: { title: "Chipotle", domain: "chipotle.com", color: "#451400" },
  DPZ: { title: "Domino's", domain: "dominos.com", color: "#006491" },
  CAVA: { title: "Cava", domain: "cava.com", color: "#111111" },
  LULU: { title: "Lululemon", domain: "lululemon.com", color: "#c8102e" },
  CROX: { title: "Crocs", domain: "crocs.com", color: "#111111" },
  ETSY: { title: "Etsy", domain: "etsy.com", color: "#f16521" },
  EBAY: { title: "eBay", domain: "ebay.com", color: "#e53238" },
  DASH: { title: "DoorDash", domain: "doordash.com", color: "#ff3008" },
  LYFT: { title: "Lyft", domain: "lyft.com", color: "#ff00bf" },
  EXPE: { title: "Expedia", domain: "expedia.com", color: "#fddb32" },
  ROKU: { title: "Roku", domain: "roku.com", color: "#662d91" },
  WBD: { title: "Warner Bros Discovery", domain: "wbd.com", color: "#0077c8" },
  ZM: { title: "Zoom", domain: "zoom.us", color: "#0b5cff" },
  DOCU: { title: "DocuSign", domain: "docusign.com", color: "#ffcf00" },
  TWLO: { title: "Twilio", domain: "twilio.com", color: "#f22f46" },
  SNOW: { title: "Snowflake", domain: "snowflake.com", color: "#29b5e8" },
  DDOG: { title: "Datadog", domain: "datadoghq.com", color: "#632ca6" },
  NET: { title: "Cloudflare", domain: "cloudflare.com", color: "#f38020" },
  MDB: { title: "MongoDB", domain: "mongodb.com", color: "#47a248" },
  OKTA: { title: "Okta", domain: "okta.com", color: "#00297a" },
  TEAM: { title: "Atlassian", domain: "atlassian.com", color: "#0052cc" },
  WDAY: { title: "Workday", domain: "workday.com", color: "#0875e1" },
  PANW: { title: "Palo Alto Networks", domain: "paloaltonetworks.com", color: "#fa582d" },
  CRWD: { title: "CrowdStrike", domain: "crowdstrike.com", color: "#fc0000" },
  FTNT: { title: "Fortinet", domain: "fortinet.com", color: "#ee3124" },
  DELL: { title: "Dell", domain: "dell.com", color: "#0076ce" },
  HPQ: { title: "HP", domain: "hp.com", color: "#0096d6" },
  ARM: { title: "Arm", domain: "arm.com", color: "#0091bd" },
  MU: { title: "Micron", domain: "micron.com", color: "#000f8f" },
  ADI: { title: "Analog Devices", domain: "analog.com", color: "#111111" }
};

export function getBrandLogo(ticker: string): BrandLogo | undefined {
  return BRAND_LOGO_DATABASE[ticker.trim().toUpperCase()];
}

export function getBrandIcon(ticker: string): BrandIcon | undefined {
  return getBrandLogo(ticker)?.icon;
}

export function getBrandColor(ticker: string): string | undefined {
  return getBrandLogo(ticker)?.color;
}

export function getBrandLogoUrl(ticker: string): string | undefined {
  const domain = getBrandLogo(ticker)?.domain;
  return domain ? `https://logo.clearbit.com/${domain}` : undefined;
}
