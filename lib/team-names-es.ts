/** Spanish display names keyed by FIFA code. */
const BY_FIFA: Record<string, string> = {
  MEX: "México",
  RSA: "Sudáfrica",
  KOR: "Corea del Sur",
  CZE: "República Checa",
  CAN: "Canadá",
  BIH: "Bosnia y Herzegovina",
  QAT: "Catar",
  SUI: "Suiza",
  BRA: "Brasil",
  MAR: "Marruecos",
  HAI: "Haití",
  SCO: "Escocia",
  USA: "Estados Unidos",
  PAR: "Paraguay",
  AUS: "Australia",
  TUR: "Turquía",
  GER: "Alemania",
  CUW: "Curazao",
  CIV: "Costa de Marfil",
  ECU: "Ecuador",
  NED: "Países Bajos",
  JPN: "Japón",
  SWE: "Suecia",
  TUN: "Túnez",
  BEL: "Bélgica",
  EGY: "Egipto",
  IRN: "Irán",
  NZL: "Nueva Zelanda",
  ESP: "España",
  CPV: "Cabo Verde",
  KSA: "Arabia Saudita",
  URU: "Uruguay",
  FRA: "Francia",
  SEN: "Senegal",
  IRQ: "Irak",
  NOR: "Noruega",
  ARG: "Argentina",
  ALG: "Argelia",
  AUT: "Austria",
  JOR: "Jordania",
  POR: "Portugal",
  COD: "República Democrática del Congo",
  UZB: "Uzbekistán",
  COL: "Colombia",
  ENG: "Inglaterra",
  CRO: "Croacia",
  GHA: "Ghana",
  PAN: "Panamá",
}

/** Fallback keyed by English API name. */
const BY_EN: Record<string, string> = Object.fromEntries(
  Object.entries({
    Mexico: "México",
    "South Africa": "Sudáfrica",
    "South Korea": "Corea del Sur",
    "Czech Republic": "República Checa",
    Canada: "Canadá",
    "Bosnia and Herzegovina": "Bosnia y Herzegovina",
    Qatar: "Catar",
    Switzerland: "Suiza",
    Brazil: "Brasil",
    Morocco: "Marruecos",
    Haiti: "Haití",
    Scotland: "Escocia",
    "United States": "Estados Unidos",
    Paraguay: "Paraguay",
    Australia: "Australia",
    Turkey: "Turquía",
    Germany: "Alemania",
    "Curaçao": "Curazao",
    "Ivory Coast": "Costa de Marfil",
    Ecuador: "Ecuador",
    Netherlands: "Países Bajos",
    Japan: "Japón",
    Sweden: "Suecia",
    Tunisia: "Túnez",
    Belgium: "Bélgica",
    Egypt: "Egipto",
    Iran: "Irán",
    "New Zealand": "Nueva Zelanda",
    Spain: "España",
    "Cape Verde": "Cabo Verde",
    "Saudi Arabia": "Arabia Saudita",
    Uruguay: "Uruguay",
    France: "Francia",
    Senegal: "Senegal",
    Iraq: "Irak",
    Norway: "Noruega",
    Argentina: "Argentina",
    Algeria: "Argelia",
    Austria: "Austria",
    Jordan: "Jordania",
    Portugal: "Portugal",
    "Democratic Republic of the Congo": "República Democrática del Congo",
    Uzbekistan: "Uzbekistán",
    Colombia: "Colombia",
    England: "Inglaterra",
    Croatia: "Croacia",
    Ghana: "Ghana",
    Panama: "Panamá",
  }),
)

/** Translate knockout placeholder labels from the API. */
export function translateKnockoutLabel(label: string): string {
  const winnerGroup = label.match(/^Winner Group ([A-L])$/i)
  if (winnerGroup) return `Campeón del grupo ${winnerGroup[1]}`

  const runnerUp = label.match(/^Runner-up Group ([A-L])$/i)
  if (runnerUp) return `Subcampeón del grupo ${runnerUp[1]}`

  const third = label.match(/^3rd Group (.+)$/i)
  if (third) return `Mejor tercero (${third[1].replace(/\//g, ", ")})`

  const winnerMatch = label.match(/^Winner Match (\d+)$/i)
  if (winnerMatch) return `Ganador del partido ${winnerMatch[1]}`

  const loserMatch = label.match(/^Loser Match (\d+)$/i)
  if (loserMatch) return `Perdedor del partido ${loserMatch[1]}`

  return BY_EN[label] ?? label
}

export function teamNameEs(fifaCode?: string, nameEn?: string): string {
  if (fifaCode && BY_FIFA[fifaCode]) return BY_FIFA[fifaCode]
  if (nameEn) {
    if (BY_EN[nameEn]) return BY_EN[nameEn]
    return translateKnockoutLabel(nameEn)
  }
  return "Por definir"
}
