import { FrecuenciaDiastolica } from "./frecuenciaDiastolica.js";
import { FrecuenciaSistolica } from "./frecuenciaSistolica.js";

export class TensionArterial {
  sistolica: FrecuenciaSistolica;
  diastolica: FrecuenciaDiastolica;

  public constructor(sistolica: number, diastolica: number) {
    try {
      this.sistolica = new FrecuenciaSistolica(sistolica);
      this.diastolica = new FrecuenciaDiastolica(diastolica);
    } catch (error) {
      if (error instanceof Error && error.message.includes("fuera de rango")) {
        throw new Error("La tensión arterial se encuentra fuera de rango");
      }
      throw error;
    }
  }

  get Sistolica(): number {
    return this.sistolica.Valor;
  }

  get Diastolica(): number {
    return this.diastolica.Valor;
  }
}
