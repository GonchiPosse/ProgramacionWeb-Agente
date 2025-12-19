import { Ingreso } from "../../models/ingreso.js";
import { NivelEmergencia } from "../../models/nivelEmergencia.js";
import { EstadoIngreso } from "../../models/estadoIngreso.js";

export interface ResultadoPriorizacion {
  ingreso: Ingreso;
  puntaje: number;
  razones: string[];
  nivelEmergencia: NivelEmergencia;
}

export class ExpertoPriorizacion {
  public sugerir(
    ingresos: Ingreso[],
    ahora: Date = new Date(),
  ): ResultadoPriorizacion | null {
    const orden: ResultadoPriorizacion[] = this.sugerirOrden(ingresos, ahora);
    return orden.length > 0 ? orden[0]! : null;
  }

  public sugerirOrden(
    ingresos: Ingreso[],
    ahora: Date = new Date(),
  ): ResultadoPriorizacion[] {
    const pendientes: Ingreso[] = ingresos.filter(
      (ingreso) => ingreso.Estado === EstadoIngreso.PENDIENTE,
    );
    if (pendientes.length === 0) {
      return [];
    }

    const grupos: Map<number, Ingreso[]> = new Map<number, Ingreso[]>();
    for (const ingreso of pendientes) {
      const codigo: number = ingreso.NivelEmergencia.codigo;
      const existentes: Ingreso[] = grupos.get(codigo) ?? [];
      existentes.push(ingreso);
      grupos.set(codigo, existentes);
    }

    const codigosOrdenados: number[] = Array.from(grupos.keys()).sort(
      (a, b) => a - b,
    );

    const resultadosFinales: ResultadoPriorizacion[] = [];
    for (const codigo of codigosOrdenados) {
      const ingresosNivel: Ingreso[] = grupos.get(codigo) ?? [];
      const resultados: ResultadoPriorizacion[] = ingresosNivel.map((ingreso) =>
        this.calcularResultado(ingreso, ahora),
      );
      resultados.sort((a, b) => {
        if (b.puntaje !== a.puntaje) {
          return b.puntaje - a.puntaje;
        }
        return (
          a.ingreso.FechaIngreso.getTime() - b.ingreso.FechaIngreso.getTime()
        );
      });
      resultadosFinales.push(...resultados);
    }

    return resultadosFinales;
  }

  private calcularResultado(ingreso: Ingreso, ahora: Date): ResultadoPriorizacion {
    const razones: string[] = [];
    let puntaje: number = 0;

    const puntajeSignos: number = this.puntuarSignosVitales(ingreso, razones);
    puntaje += puntajeSignos;

    const puntajeInforme: number = this.puntuarInforme(ingreso, razones);
    puntaje += puntajeInforme;

    const puntajeEspera: number = this.puntuarTiempoEspera(ingreso, ahora, razones);
    puntaje += puntajeEspera;

    return {
      ingreso,
      puntaje,
      razones,
      nivelEmergencia: ingreso.NivelEmergencia,
    };
  }

  private puntuarSignosVitales(ingreso: Ingreso, razones: string[]): number {
    let puntaje: number = 0;

    const temp: number = ingreso.Temperatura;
    if (temp >= 39) {
      puntaje += 3;
      razones.push(`Temperatura alta (${temp}°C)`);
    } else if (temp >= 38) {
      puntaje += 1;
      razones.push(`Fiebre (${temp}°C)`);
    } else if (temp <= 35) {
      puntaje += 3;
      razones.push(`Temperatura baja (${temp}°C)`);
    }

    const fc: number = ingreso.FrecuenciaCardiaca;
    if (fc >= 130) {
      puntaje += 3;
      razones.push(`Taquicardia marcada (${fc} lpm)`);
    } else if (fc >= 110) {
      puntaje += 2;
      razones.push(`Taquicardia (${fc} lpm)`);
    } else if (fc <= 50) {
      puntaje += 2;
      razones.push(`Bradicardia (${fc} lpm)`);
    }

    const fr: number = ingreso.FrecuenciaRespiratoria;
    if (fr >= 30) {
      puntaje += 3;
      razones.push(`Taquipnea marcada (${fr} rpm)`);
    } else if (fr >= 22) {
      puntaje += 2;
      razones.push(`Taquipnea (${fr} rpm)`);
    } else if (fr <= 10) {
      puntaje += 3;
      razones.push(`Bradipnea (${fr} rpm)`);
    }

    const sistolica: number = ingreso.TensionArterialSistolica;
    const diastolica: number = ingreso.TensionArterialDiastolica;
    if (sistolica <= 90) {
      puntaje += 3;
      razones.push(`Hipotension (${sistolica}/${diastolica} mmHg)`);
    } else if (sistolica >= 160 || diastolica >= 100) {
      puntaje += 2;
      razones.push(`Hipertension (${sistolica}/${diastolica} mmHg)`);
    }

    return puntaje;
  }

  private puntuarInforme(ingreso: Ingreso, razones: string[]): number {
    const informe: string = ingreso.Informe.toLowerCase();
    let puntaje: number = 0;

    const reglas: Array<{ clave: string; puntos: number; motivo: string }> = [
      { clave: "dolor torac", puntos: 3, motivo: "Informe: dolor torácico" },
      { clave: "disnea", puntos: 3, motivo: "Informe: disnea" },
      { clave: "inconsciente", puntos: 5, motivo: "Informe: inconsciente" },
      { clave: "convulsion", puntos: 5, motivo: "Informe: convulsiones" },
      { clave: "sangrado", puntos: 4, motivo: "Informe: sangrado" },
      { clave: "politrauma", puntos: 4, motivo: "Informe: politraumatismo" },
      { clave: "acv", puntos: 4, motivo: "Informe: ACV sospechado" },
    ];

    for (const regla of reglas) {
      if (informe.includes(regla.clave)) {
        puntaje += regla.puntos;
        razones.push(regla.motivo);
      }
    }

    return puntaje;
  }

  private puntuarTiempoEspera(ingreso: Ingreso, ahora: Date, razones: string[]): number {
    const minutos: number = Math.floor(
      (ahora.getTime() - ingreso.FechaIngreso.getTime()) / 60000,
    );
    if (minutos >= 120) {
      razones.push(`Tiempo de espera alto (${minutos} min)`);
      return 2;
    }
    if (minutos >= 60) {
      razones.push(`Tiempo de espera moderado (${minutos} min)`);
      return 1;
    }
    return 0;
  }
}
