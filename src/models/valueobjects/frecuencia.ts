export abstract class Frecuencia {
  private valor: number;
  private nombre: string;

  protected constructor(nombre: string, valor: number, rangoMinimo?: number, rangoMaximo?: number) {
    this.nombre = nombre;
    this.assertValorNoNegativo(valor);
    if (rangoMinimo !== undefined && rangoMaximo !== undefined) {
      this.assertValorEnRango(valor, rangoMinimo, rangoMaximo);
    }
    this.valor = valor;
  }

  public assertValorNoNegativo(valor: number): void {
    if (valor < 0) {
      throw new Error(`La ${this.nombre.toLowerCase()} no puede ser negativa`);
    }
  }

  public assertValorEnRango(valor: number, minimo: number, maximo: number): void {
    if (valor < minimo || valor > maximo) {
      throw new Error(`La ${this.nombre.toLowerCase()} se encuentra fuera de rango`);
    }
  }

  get Valor(): number {
    return this.valor;
  }
}
