export class Temperatura {
  private static readonly RANGO_MINIMO: number = 30;
  private static readonly RANGO_MAXIMO: number = 45;
  private valor: number;

  public constructor(valor: number) {
    this.assertValorEnRango(valor);
    this.valor = valor;
  }

  private assertValorEnRango(valor: number): void {
    if (valor < Temperatura.RANGO_MINIMO || valor > Temperatura.RANGO_MAXIMO) {
      throw new Error("La temperatura se encuentra fuera de rango");
    }
  }

  get Valor(): number {
    return this.valor;
  }
}

